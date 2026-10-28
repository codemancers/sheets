import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { toTanStackColumn } from './define-sheet-column.js';
import type { CellStatusState } from './use-cell-status.js';
import type { RowChangesState } from './use-row-changes.js';
import type { SheetColumn, SheetState, SheetStateChange } from './types.js';

export type UseSheetOptions<TData> = {
  columns: SheetColumn<TData>[];
  data: TData[];
  pageCount?: number;
  state?: SheetState;
  getRowId?: (row: TData, index: number) => string;
  /**
   * The whole `useCellStatus()` state. Not just the map: cells validate their
   * own committed values against the column schema, so they need the setters.
   */
  cellStatus?: CellStatusState;
  /**
   * From `useRowChanges()`. Pass it to submit per row instead of per cell —
   * editable cells then stage their committed values here. Omit to keep each
   * cell performing its own write through its `onCommit`.
   */
  rowChanges?: RowChangesState;
} & SheetStateChange;

const DEFAULT_ROW_HEIGHT = 32;

export function useSheet<TData>({
  columns,
  data,
  pageCount,
  state = {},
  onSortingChange,
  onColumnFiltersChange,
  onPaginationChange,
  onColumnSizingChange,
  onColumnOrderChange,
  onColumnVisibilityChange,
  getRowId,
  cellStatus,
  rowChanges,
}: UseSheetOptions<TData>) {
  const tanstackColumns = useMemo<ColumnDef<TData, unknown>[]>(
    () => columns.map((col) => toTanStackColumn(col)),
    [columns],
  );

  const table: Table<TData> = useReactTable<TData>({
    data,
    columns: tanstackColumns,
    pageCount: pageCount ?? -1,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      sorting: state.sorting ?? [],
      columnFilters: state.columnFilters ?? [],
      pagination: state.pagination ?? { pageIndex: 0, pageSize: 50 },
      columnSizing: state.columnSizing ?? {},
      columnOrder: state.columnOrder ?? [],
      columnVisibility: state.columnVisibility ?? {},
    },
    onSortingChange: onSortingChange as never,
    onColumnFiltersChange: onColumnFiltersChange as never,
    onPaginationChange: onPaginationChange as never,
    onColumnSizingChange: onColumnSizingChange as never,
    onColumnOrderChange: onColumnOrderChange as never,
    onColumnVisibilityChange: onColumnVisibilityChange as never,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const rowHeight = state.rowHeight ?? DEFAULT_ROW_HEIGHT;

  return { table, rowHeight, columns, cellStatus, rowChanges };
}

export type SheetInstance<TData> = ReturnType<typeof useSheet<TData>>;
