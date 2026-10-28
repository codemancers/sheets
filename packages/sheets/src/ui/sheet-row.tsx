import type { CellContext, Row } from '@tanstack/react-table';
import { cx } from './cx.js';
import { useEffect, useRef } from 'react';
import { SheetCell } from './sheet-cell.js';
import { SheetTextCell } from './cells/text-cell.js';
import { SheetRowNumber } from './sheet-row-number.js';
import { SheetSpacerColumn } from './sheet-spacer-column.js';
import {
  cellStatusKey,
  type CellStatusState,
} from '../hooks/use-cell-status.js';
import type { RowChangesState } from '../hooks/use-row-changes.js';

export type SheetRowProps<TData> = {
  row: Row<TData>;
  rowIndex: number;
  gridTemplateColumns: string;
  rowHeight: number;
  highlight?: boolean;
  cellStatus?: CellStatusState;
  rowChanges?: RowChangesState;
};

/**
 * Calls the column's cell renderer inside a component whose type never
 * changes. TanStack's flexRender uses the renderer itself as the component
 * type, so columns rebuilt on a render (an inline array, or a memo whose deps
 * changed) remounted every cell and closed any open editor.
 */
function SheetCellContent<TData>({
  context,
}: {
  context: CellContext<TData, unknown>;
}) {
  const render = context.column.columnDef.cell;
  const content = typeof render === 'function' ? render(context) : render;
  // A bare value (a column with no cell renderer gets TanStack's, which
  // returns the value as a string) needs the text cell's padding.
  return typeof content === 'string' || typeof content === 'number' ? (
    <SheetTextCell>{content}</SheetTextCell>
  ) : (
    content
  );
}

export function SheetRow<TData>({
  row,
  rowIndex,
  gridTemplateColumns,
  rowHeight,
  highlight = false,
  cellStatus,
  rowChanges,
}: SheetRowProps<TData>) {
  const cells = row.getVisibleCells();
  const ref = useRef<HTMLDivElement | null>(null);

  // Scroll the highlighted row into view on the frame it becomes highlighted.
  // jsdom (vitest) doesn't implement scrollIntoView; guard so tests don't crash.
  useEffect(() => {
    if (
      highlight &&
      ref.current &&
      typeof ref.current.scrollIntoView === 'function'
    ) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlight]);

  return (
    <div
      ref={ref}
      role="row"
      className={cx(
        'grid scroll-mb-16 transition-colors duration-1000',
        highlight
          ? 'bg-yellow-100 dark:bg-yellow-500/20'
          : 'hover:bg-zinc-950/2.5 dark:hover:bg-white/2.5',
      )}
      style={{ gridTemplateColumns, minHeight: `${rowHeight}px` }}
    >
      <SheetRowNumber label={rowIndex + 1} />
      {cells.map((cell, idx) => (
        <SheetCell
          key={cell.id}
          isFirstCol={idx === 0}
          rowId={row.id}
          columnId={cell.column.id}
          columnLabel={
            typeof cell.column.columnDef.header === 'string'
              ? cell.column.columnDef.header
              : cell.column.id
          }
          cellStatus={cellStatus}
          rowChanges={rowChanges}
          status={cellStatus?.statuses[cellStatusKey(row.id, cell.column.id)]}
        >
          <SheetCellContent context={cell.getContext()} />
        </SheetCell>
      ))}
      <SheetSpacerColumn />
    </div>
  );
}
