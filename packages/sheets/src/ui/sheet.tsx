'use client';

import { cx } from './cx.js';
import { useMemo, type ReactNode } from 'react';
import type { SheetInstance } from '../hooks/use-sheet.js';
import { SheetAddRow } from './sheet-add-row.js';
import { SheetEmpty } from './sheet-empty.js';
import { SheetLoading } from './sheet-loading.js';
import { SheetHeader } from './sheet-header.js';
import { SheetRow } from './sheet-row.js';

const ROW_NUMBER_WIDTH = 40;

export type SheetProps<TData> = {
  instance: SheetInstance<TData>;
  className?: string;
  isLoading?: boolean;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  onAddRow?: () => void;
  addRowLabel?: string;
  addRowDisabled?: boolean;
  showAddRow?: boolean;
  /**
   * Row id (matches TanStack `row.id` — usually the entity's primary key
   * when `getRowId` is configured) to highlight + scroll into view.
   * Pair with a setTimeout in the consumer to clear after a beat.
   */
  highlightedRowKey?: string;
};

export function Sheet<TData>({
  instance,
  className,
  isLoading = false,
  loadingState,
  emptyState,
  onAddRow,
  addRowLabel,
  addRowDisabled,
  showAddRow,
  highlightedRowKey,
}: SheetProps<TData>) {
  const { table, rowHeight, cellStatus, rowChanges } = instance;

  const headers = table.getHeaderGroups()[0]?.headers ?? [];

  const gridTemplateColumns = useMemo(() => {
    const colTracks = headers.map((h) => `${h.getSize() || 160}px`).join(' ');
    return `${ROW_NUMBER_WIDTH}px ${colTracks} 1fr`;
  }, [headers]);

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
      <div role="rowgroup" className="flex flex-1 flex-col">
        {isLoading ? (
          (loadingState ?? (
            <SheetLoading gridTemplateColumns={gridTemplateColumns} />
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
              highlight={highlightedRowKey === row.id}
              cellStatus={cellStatus}
              rowChanges={rowChanges}
            />
          ))
        )}
      </div>
      {!isLoading && showAddRow && onAddRow && (
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
