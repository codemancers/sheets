'use client';

import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type RowData,
  type TableOptions,
} from '@tanstack/react-table';
import type { CellStatusState } from './use-cell-status.js';
import type { RowChangesState } from './use-row-changes.js';

/**
 * Everything `useReactTable` takes — columns are plain TanStack `ColumnDef`s
 * — plus the sheet's editing state. `getCoreRowModel` is supplied.
 */
export type UseSheetOptions<TData extends RowData> = Omit<
  TableOptions<TData>,
  'getCoreRowModel'
> &
  Partial<Pick<TableOptions<TData>, 'getCoreRowModel'>> & {
    /**
     * The whole `useCellStatus()` state. Not just the map: cells validate
     * their own committed values against the column schema, so they need the
     * setters.
     */
    cellStatus?: CellStatusState;
    /**
     * From `useRowChanges()`. Pass it to submit per row instead of per cell —
     * editable cells then stage their committed values here. Omit to keep each
     * cell performing its own write through its `onCommit`.
     */
    rowChanges?: RowChangesState;
  };

/**
 * Drops undefined entries. TanStack spreads options over its defaults, so an
 * explicit `undefined` would replace a default, such as an internal state
 * updater.
 */
function defined<T extends object>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as T;
}

/**
 * `useReactTable` with a sheet's defaults: sorting and filtering in the
 * browser (TanStack skips them when `manualSorting` / `manualFiltering` is
 * set, for server-side data) and live column resizing. Any option the app
 * passes wins.
 */
export function useSheet<TData extends RowData>({
  cellStatus,
  rowChanges,
  ...options
}: UseSheetOptions<TData>) {
  const table = useReactTable<TData>({
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    // There is no pagination UI, and resetting the page index on every data
    // change would loop forever when an app passes data that is not memoised.
    autoResetPageIndex: false,
    ...defined(options),
    ...(options.state ? { state: defined(options.state) } : {}),
  });

  return { table, cellStatus, rowChanges };
}

export type SheetInstance<TData extends RowData> = ReturnType<
  typeof useSheet<TData>
>;
