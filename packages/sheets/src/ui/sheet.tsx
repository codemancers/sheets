'use client';

import { cx } from './cx.js';
import { memo, type CSSProperties, type ReactNode } from 'react';
import type { Row, RowData } from '@tanstack/react-table';
import type { SheetInstance } from '../hooks/use-sheet.js';
import type { CellStatusState } from '../hooks/use-cell-status.js';
import type { RowChangesState } from '../hooks/use-row-changes.js';
import { SheetAddRow } from './sheet-add-row.js';
import { SheetEmpty } from './sheet-empty.js';
import { SheetLoading } from './sheet-loading.js';
import { SheetHeader } from './sheet-header.js';
import { SheetRow } from './sheet-row.js';
import {
  defaultSheetLabels,
  SheetLabelsProvider,
  type SheetLabels,
} from './labels.js';

const ROW_NUMBER_WIDTH = 40;
const DEFAULT_ROW_HEIGHT = 32;

export type SheetProps<TData extends RowData> = {
  instance: SheetInstance<TData>;
  className?: string;
  /** Minimum row height, in pixels. */
  rowHeight?: number;
  isLoading?: boolean;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  /** Shows the add-row footer, whose button calls this. */
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
};

type SheetBodyProps<TData extends RowData> = {
  rows: Row<TData>[];
  rowHeight: number;
  highlightedRowId?: string;
  openRowId?: string | null;
  cellStatus?: CellStatusState;
  rowChanges?: RowChangesState;
  /** True while a column is being dragged wider or narrower. */
  resizing: boolean;
};

function SheetRows<TData extends RowData>({
  rows,
  rowHeight,
  highlightedRowId,
  openRowId,
  cellStatus,
  rowChanges,
}: SheetBodyProps<TData>) {
  return (
    <>
      {rows.map((row, idx) => (
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
      ))}
    </>
  );
}

/**
 * While a column is dragged, only the header and the root's --sheet-columns
 * change, so the rows skip re-rendering: TanStack's advice for live resizing.
 * At any other time they re-render as usual, since visibility or order
 * changes reach them through the same row objects.
 */
const SheetBody = memo(
  SheetRows,
  (prev, next) =>
    next.resizing &&
    prev.rows === next.rows &&
    prev.rowHeight === next.rowHeight &&
    prev.highlightedRowId === next.highlightedRowId &&
    prev.openRowId === next.openRowId &&
    prev.cellStatus === next.cellStatus &&
    prev.rowChanges === next.rowChanges,
) as typeof SheetRows;

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
}: SheetProps<TData>) {
  const { table, cellStatus, rowChanges } = instance;
  const text = labels
    ? { ...defaultSheetLabels, ...labels }
    : defaultSheetLabels;

  // Leaf columns, so grouped headers span their columns rather than add tracks.
  const leafColumns = table.getVisibleLeafColumns();
  const colTracks = leafColumns
    .map((column) => `${column.getSize()}px`)
    .join(' ');
  const columns = {
    '--sheet-columns': `${ROW_NUMBER_WIDTH}px ${colTracks} 1fr`,
  } as CSSProperties;

  const rows = table.getRowModel().rows;

  return (
    <SheetLabelsProvider value={text}>
      <div
        role="table"
        style={columns}
        className={cx(
          'flex h-full w-full flex-col overflow-auto bg-sheet-bg text-sm text-sheet-fg dark:bg-sheet-bg-dark dark:text-sheet-fg-dark',
          className,
        )}
      >
        <SheetHeader table={table} />
        <div
          role="rowgroup"
          aria-busy={isLoading || undefined}
          className="flex flex-1 flex-col"
        >
          {isLoading ? (
            (loadingState ?? (
              <SheetLoading
                columnCount={leafColumns.length}
                rowHeight={rowHeight}
              />
            ))
          ) : rows.length === 0 ? (
            <SheetEmpty>{emptyState}</SheetEmpty>
          ) : (
            <SheetBody
              rows={rows}
              rowHeight={rowHeight}
              highlightedRowId={highlightedRowId}
              openRowId={openRowId}
              cellStatus={cellStatus}
              rowChanges={rowChanges}
              resizing={Boolean(
                table.getState().columnSizingInfo.isResizingColumn,
              )}
            />
          )}
        </div>
        {!isLoading && onAddRow && (
          <SheetAddRow onClick={onAddRow} disabled={addRowDisabled} />
        )}
      </div>
    </SheetLabelsProvider>
  );
}
