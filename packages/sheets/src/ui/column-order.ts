import type { Column, RowData, Table } from '@tanstack/react-table';
import type { SheetFeatures } from '../hooks/use-sheet.js';

type SheetTable<TData extends RowData> = Table<SheetFeatures, TData>;
type SheetColumn<TData extends RowData> = Column<SheetFeatures, TData, unknown>;

/** Where a column lands next to another, in the column order. */
export type MoveSide = 'before' | 'after';

/** A column's name in the sheet's own text, as in "Sort Title". */
export function columnLabel<TData extends RowData>(column: SheetColumn<TData>) {
  // The header itself may render anything.
  return typeof column.columnDef.header === 'string'
    ? column.columnDef.header
    : column.id;
}

/**
 * `meta: { enableColumnOrdering: false }` keeps a column where it is. Read
 * without typing `meta`: a typed `meta` would stop the apps' own `meta`
 * values typed with an interface from compiling.
 */
function isFixed<TData extends RowData>(column: SheetColumn<TData>) {
  const meta: unknown = column.columnDef.meta;
  return (
    typeof meta === 'object' &&
    meta !== null &&
    'enableColumnOrdering' in meta &&
    meta.enableColumnOrdering === false
  );
}

/**
 * A column's siblings in their current order, each one moving as a unit: a
 * column, or a group with all its columns. A column moves only among these,
 * so it stays in its group, and a column outside a group steps over a whole
 * one. Hidden and fixed units keep their places.
 */
function siblingUnits<TData extends RowData>(
  table: SheetTable<TData>,
  column: SheetColumn<TData>,
  order: string[],
) {
  const position = new Map(order.map((id, index) => [id, index]));
  const siblings = column.parent
    ? column.parent.columns
    : table.getAllColumns();
  return siblings
    .map((sibling) => {
      const leaves = sibling.getLeafColumns();
      const ids = leaves
        .map((leaf) => leaf.id)
        .sort((a, b) => (position.get(a) ?? 0) - (position.get(b) ?? 0));
      return {
        column: sibling,
        leaves: ids,
        start: position.get(ids[0]) ?? 0,
        movable:
          leaves.some((leaf) => leaf.getIsVisible()) &&
          !isFixed(sibling) &&
          !leaves.some(isFixed),
      };
    })
    .sort((a, b) => a.start - b.start);
}

const leafOrder = <TData extends RowData>(table: SheetTable<TData>) =>
  table.getAllLeafColumns().map((leaf) => leaf.id);

/** The nearest siblings a column can move past, before and after it. */
export function moveTargets<TData extends RowData>(
  table: SheetTable<TData>,
  column: SheetColumn<TData>,
): { before?: SheetColumn<TData>; after?: SheetColumn<TData> } {
  const units = siblingUnits(table, column, leafOrder(table));
  const index = units.findIndex((unit) => unit.column.id === column.id);
  if (index === -1 || !units[index].movable) return {};
  return {
    before: units
      .slice(0, index)
      .reverse()
      .find((unit) => unit.movable)?.column,
    after: units.slice(index + 1).find((unit) => unit.movable)?.column,
  };
}

/** Whether a dragged column can be dropped next to `target`. */
export function canDropOn<TData extends RowData>(
  table: SheetTable<TData>,
  dragged: SheetColumn<TData>,
  target: SheetColumn<TData>,
) {
  if (dragged.id === target.id) return false;
  const units = siblingUnits(table, dragged, leafOrder(table));
  const movable = (id: string) =>
    units.some((unit) => unit.movable && unit.column.id === id);
  return movable(dragged.id) && movable(target.id);
}

/**
 * Moves `column` before or after `target`, one of its siblings. Builds the
 * whole order from the current one, because TanStack's `columnOrder` starts
 * empty. Returns whether anything moved.
 */
export function moveColumn<TData extends RowData>(
  table: SheetTable<TData>,
  column: SheetColumn<TData>,
  target: SheetColumn<TData>,
  side: MoveSide,
) {
  const order = leafOrder(table);
  const units = siblingUnits(table, column, order);
  const moving = units.find((unit) => unit.column.id === column.id);
  const onto = units.find((unit) => unit.column.id === target.id);
  if (!moving?.movable || !onto?.movable || moving === onto) return false;

  // The movable units in their new order. The rest keep their places.
  const moved = units.filter((unit) => unit.movable && unit !== moving);
  moved.splice(moved.indexOf(onto) + (side === 'after' ? 1 : 0), 0, moving);
  const queue = moved.values();
  const leaves = units
    .flatMap((unit) => (unit.movable ? queue.next().value : unit)?.leaves ?? [])
    .values();

  // The siblings' columns go back into the places they held in the order.
  const own = new Set(units.flatMap((unit) => unit.leaves));
  const next = order.map((id) =>
    own.has(id) ? (leaves.next().value ?? id) : id,
  );
  if (next.every((id, index) => id === order[index])) return false;
  table.setColumnOrder(next);
  return true;
}
