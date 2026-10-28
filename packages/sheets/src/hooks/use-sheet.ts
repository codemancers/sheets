import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table,
  type TableOptions,
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
  /**
   * The table state the app controls, each key paired with its change
   * handler. Keys left out are managed by the sheet, so an app that does not
   * care about column widths still gets working resize handles.
   */
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
  /**
   * Any other TanStack Table option, applied last. Sorting, filtering and
   * pagination are manual by default (the server does them); for local data,
   * sort in the browser with
   * `{ manualSorting: false, getSortedRowModel: getSortedRowModel() }`.
   */
  tableOptions?: Partial<TableOptions<TData>>;
} & SheetStateChange;

const DEFAULT_ROW_HEIGHT = 32;

/**
 * Drops undefined entries. TanStack spreads options over its defaults, so an
 * explicit `undefined` would replace the internal state or its updater.
 */
function defined<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function useSheet<TData>({
  columns,
  data,
  pageCount,
  state = {},
  getRowId,
  cellStatus,
  rowChanges,
  tableOptions,
  ...stateChange
}: UseSheetOptions<TData>) {
  const tanstackColumns = useMemo<ColumnDef<TData, unknown>[]>(
    () => columns.map((col) => toTanStackColumn(col)),
    [columns],
  );
  const { rowHeight = DEFAULT_ROW_HEIGHT, ...tableState } = state;

  const table: Table<TData> = useReactTable<TData>({
    data,
    columns: tanstackColumns,
    pageCount: pageCount ?? -1,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    initialState: { pagination: { pageIndex: 0, pageSize: 50 } },
    state: defined(tableState),
    ...defined(stateChange),
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    ...tableOptions,
  });

  return { table, rowHeight, columns, cellStatus, rowChanges };
}

export type SheetInstance<TData> = ReturnType<typeof useSheet<TData>>;
