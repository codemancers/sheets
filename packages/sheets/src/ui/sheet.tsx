'use client';

import { cx } from './cx.js';
import type { ReactNode } from 'react';
import type { RowData } from '@tanstack/react-table';
import type { SheetInstance } from '../hooks/use-sheet.js';
import { SheetAddRow } from './sheet-add-row.js';
import { SheetEmpty } from './sheet-empty.js';
import { SheetLoading } from './sheet-loading.js';
import { SheetHeader } from './sheet-header.js';
import { SheetRow } from './sheet-row.js';

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
  addRowLabel?: string;
  addRowDisabled?: boolean;
  /**
   * The id of a row to highlight and scroll into view: TanStack's `row.id`,
   * which is the entity's own id when `getRowId` is set. Clear it after a
   * moment to fade the highlight.
   */
  highlightedRowId?: string;
};

export function Sheet<TData extends RowData>({
  instance,
  className,
  rowHeight = DEFAULT_ROW_HEIGHT,
  isLoading = false,
  loadingState,
  emptyState,
  onAddRow,
  addRowLabel,
  addRowDisabled,
  highlightedRowId,
}: SheetProps<TData>) {
  const { table, cellStatus, rowChanges } = instance;

  // Leaf columns, so grouped headers span their columns rather than add tracks.
  const colTracks = table
    .getVisibleLeafColumns()
    .map((column) => `${column.getSize()}px`)
    .join(' ');
  const gridTemplateColumns = `${ROW_NUMBER_WIDTH}px ${colTracks} 1fr`;

  const rows = table.getRowModel().rows;

  return (
    <div
      role="table"
      className={cx(
        'flex h-full w-full flex-col overflow-auto bg-white text-sm text-zinc-950 dark:bg-zinc-900 dark:text-white',
        className,
      )}
    >
      <SheetHeader table={table} gridTemplateColumns={gridTemplateColumns} />
      <div
        role="rowgroup"
        aria-busy={isLoading || undefined}
        className="flex flex-1 flex-col"
      >
        {isLoading ? (
          (loadingState ?? (
            <SheetLoading
              gridTemplateColumns={gridTemplateColumns}
              rowHeight={rowHeight}
            />
          ))
        ) : rows.length === 0 ? (
          <SheetEmpty gridTemplateColumns={gridTemplateColumns}>
            {emptyState ?? 'No data.'}
          </SheetEmpty>
        ) : (
          rows.map((row, idx) => (
            <SheetRow
              key={row.id}
              row={row}
              rowIndex={idx}
              gridTemplateColumns={gridTemplateColumns}
              rowHeight={rowHeight}
              highlight={highlightedRowId === row.id}
              cellStatus={cellStatus}
              rowChanges={rowChanges}
            />
          ))
        )}
      </div>
      {!isLoading && onAddRow && (
        <SheetAddRow
          gridTemplateColumns={gridTemplateColumns}
          onClick={onAddRow}
          disabled={addRowDisabled}
          label={addRowLabel}
        />
      )}
    </div>
  );
}
