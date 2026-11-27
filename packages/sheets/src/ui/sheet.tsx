'use client';

import { cx } from './cx.js';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { RowData, Table } from '@tanstack/react-table';
import type { SheetFeatures, SheetInstance } from '../hooks/use-sheet.js';
import { SheetAddRow } from './sheet-add-row.js';
import { SheetEmpty } from './sheet-empty.js';
import { SheetLoading } from './sheet-loading.js';
import { SheetHeader } from './sheet-header.js';
import { AnnounceContext } from './sheet-column-move.js';
import { SheetRow } from './sheet-row.js';
import {
  defaultSheetLabels,
  SheetLabelsProvider,
  type SheetLabels,
} from './labels.js';

const ROW_NUMBER_WIDTH = 40;
const DEFAULT_ROW_HEIGHT = 32;

/** The same labels: the same keys, with the same value or function under each. */
function sameLabels(a?: Partial<SheetLabels>, b?: Partial<SheetLabels>) {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a) as (keyof SheetLabels)[];
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.is(a[key], b[key]))
  );
}

/**
 * The row-number column, each visible leaf column's width, then a spacer that
 * fills the rest. Leaf columns, so grouped headers span their columns rather
 * than add tracks.
 */
function columnTracks<TData extends RowData>(
  table: Table<SheetFeatures, TData>,
) {
  const widths = table
    .getVisibleLeafColumns()
    .map((column) => `${column.getSize()}px`)
    .join(' ');
  return `${ROW_NUMBER_WIDTH}px ${widths} 1fr`;
}

export type SheetProps<TData extends RowData> = {
  instance: SheetInstance<TData>;
  className?: string;
  /** Minimum row height, in pixels. */
  rowHeight?: number;
  isLoading?: boolean;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  /** Shows the add-row button, right below the rows, which calls this. */
  onAddRow?: () => void;
  addRowDisabled?: boolean;
  /**
   * The id of a row to highlight and scroll into view: TanStack's `row.id`,
   * which is the entity's own id when `getRowId` is set. Clear it after a
   * moment to fade the highlight.
   */
  highlightedRowId?: string;
  /**
   * The id of the row open in a drawer or panel, which is marked as current
   * (`useRowDrawer().openRowId`).
   */
  openRowId?: string | null;
  /** Replaces any of the text the sheet renders itself, e.g. to translate it. */
  labels?: Partial<SheetLabels>;
  /**
   * Lets people move columns: by dragging a header's handle onto another
   * header, or from the menu the handle opens. A column with
   * `meta: { enableColumnOrdering: false }` stays where it is, and a column
   * in a group stays in its group. The order is TanStack's `columnOrder`.
   */
  enableColumnOrdering?: boolean;
};

export function Sheet<TData extends RowData>({
  instance,
  className,
  rowHeight = DEFAULT_ROW_HEIGHT,
  isLoading = false,
  loadingState,
  emptyState,
  onAddRow,
  addRowDisabled,
  highlightedRowId,
  openRowId,
  labels,
  enableColumnOrdering,
}: SheetProps<TData>) {
  const { table, cellStatus, rowChanges } = instance;
  // Apps usually pass labels inline, a new object on every render. Keep the
  // merged labels while their values are the same, so the context changes
  // only when the text does, and a memoised component that reads it stays
  // still.
  const labelsRef = useRef<{
    given?: Partial<SheetLabels>;
    merged: SheetLabels;
  }>(undefined);
  if (!labelsRef.current || !sameLabels(labelsRef.current.given, labels)) {
    labelsRef.current = {
      given: labels,
      merged: labels
        ? { ...defaultSheetLabels, ...labels }
        : defaultSheetLabels,
    };
  }
  const text = labelsRef.current.merged;

  // Where a moved column went, for screen readers. Written straight to the
  // live region, after a short wait so the focus returning to the move
  // handle doesn't talk over it, as Chrome's drag-and-drop guide advises.
  const live = useRef<HTMLDivElement>(null);
  const announcing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const announce = useCallback((message: () => string) => {
    const region = live.current;
    if (!region) return;
    region.textContent = '';
    clearTimeout(announcing.current);
    announcing.current = setTimeout(() => {
      region.textContent = message();
    }, 500);
  }, []);
  useEffect(() => () => clearTimeout(announcing.current), []);

  // TanStack's advice for resizing: a drag changes no state the sheet renders
  // from (see useSheet), so the new widths go straight to the root's
  // --sheet-columns, which every row lays out on. The style below sets the
  // same value when the sheet renders, for server-rendered HTML and for
  // columns being hidden, shown or moved.
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const writeColumnTracks = () =>
      rootRef.current?.style.setProperty(
        '--sheet-columns',
        columnTracks(table),
      );
    writeColumnTracks();
    const { unsubscribe } =
      table.atoms.columnSizing.subscribe(writeColumnTracks);
    return () => unsubscribe();
  }, [table]);
  const columns = { '--sheet-columns': columnTracks(table) } as CSSProperties;

  // Rows pinned with TanStack's row pinning, such as a new row being filled
  // in, stay at the top or bottom whatever the sort.
  const top = table.getTopRows();
  const center = table.getCenterRows();
  const bottom = table.getBottomRows();
  const rows =
    top.length || bottom.length ? [...top, ...center, ...bottom] : center;

  return (
    <SheetLabelsProvider value={text}>
      <AnnounceContext.Provider value={announce}>
        <div
          ref={rootRef}
          role="table"
          style={columns}
          className={cx(
            'flex h-full w-full flex-col overflow-auto bg-sheet-bg text-sm text-sheet-fg dark:bg-sheet-bg-dark dark:text-sheet-fg-dark',
            className,
          )}
        >
          <SheetHeader
            table={table}
            enableColumnOrdering={enableColumnOrdering}
          />
          <div
            role="rowgroup"
            aria-busy={isLoading || undefined}
            className="flex flex-col"
          >
            {isLoading ? (
              (loadingState ?? (
                <SheetLoading
                  columnCount={table.getVisibleLeafColumns().length}
                  rowHeight={rowHeight}
                />
              ))
            ) : rows.length === 0 ? (
              <SheetEmpty>
                {/* `emptyState` means there's no data. Here there is, but the
                  filters hide all of it. */}
                {table.state.columnFilters.length > 0 ? (
                  <>
                    {text.noMatches}{' '}
                    <button
                      type="button"
                      onClick={() => table.setColumnFilters([])}
                      className="text-sheet-link hover:text-sheet-link-hover dark:text-sheet-link-dark dark:hover:text-sheet-link-hover-dark"
                    >
                      {text.clearFilters}
                    </button>
                  </>
                ) : (
                  emptyState
                )}
              </SheetEmpty>
            ) : (
              rows.map((row, idx) => (
                <SheetRow
                  key={row.id}
                  row={row}
                  rowIndex={idx}
                  rowHeight={rowHeight}
                  highlight={highlightedRowId === row.id}
                  open={openRowId === row.id}
                  cellStatus={cellStatus}
                  rowChanges={rowChanges}
                />
              ))
            )}
          </div>
          {!isLoading && onAddRow && (
            <SheetAddRow onClick={onAddRow} disabled={addRowDisabled} />
          )}
        </div>
        {/* Beside the table, which may hold only rows. */}
        {enableColumnOrdering && (
          <div ref={live} role="status" className="sr-only" />
        )}
      </AnnounceContext.Provider>
    </SheetLabelsProvider>
  );
}
