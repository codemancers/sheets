'use client';

import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_equals,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  filterFn_weakEquals,
  globalFilteringFeature,
  rowPinningFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type TableOptions,
} from '@tanstack/react-table';
import { useCellStatus, type CellStatusState } from './use-cell-status.js';
import type { RowChangesState } from './use-row-changes.js';

/**
 * The TanStack features a sheet is built on, and the sort and filter
 * functions TanStack picks from when a column names none. Every sheet uses
 * this one set: TanStack v9 types a table by its feature set, so components
 * typed for this set can't take a table with another.
 */
const sheetFeatures = tableFeatures({
  columnFilteringFeature,
  columnFacetingFeature,
  globalFilteringFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowPinningFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  // Counted per column only when asked for: when a values filter opens.
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    equals: filterFn_equals,
    inDateRange: filterFn_inDateRange,
    inNumberRange: filterFn_inNumberRange,
    includesString: filterFn_includesString,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type SheetFeatures = typeof sheetFeatures;

/** A TanStack `ColumnDef` for a sheet with the default features. */
export type SheetColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  SheetFeatures,
  TData,
  TValue
>;

/**
 * Everything `useTable` takes except `features`, which is the sheet's own —
 * columns are plain TanStack `ColumnDef`s — plus the sheet's editing state.
 */
export type UseSheetOptions<TData extends RowData> = Omit<
  TableOptions<SheetFeatures, TData>,
  'features'
> & {
  /**
   * The whole `useCellStatus()` state. Not just the map: cells validate
   * their own committed values against the column schema, so they need the
   * setters. The sheet creates its own when this is omitted; pass one when
   * `useRowChanges` or your own handlers report to it.
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
 * `useTable` with a sheet's defaults: sorting and filtering in the browser
 * (TanStack skips them when `manualSorting` / `manualFiltering` is set, for
 * server-side data), each column's values and counts for its filter, and
 * live column resizing. Any option the app passes wins.
 *
 * `table.state` leaves out `columnSizing` and `columnResizing`, so resizing a
 * column doesn't re-render the component that calls this: TanStack's advice
 * for resizing with `columnResizeMode: 'onChange'`. Read them with
 * `table.atoms.columnSizing.get()`, or subscribe with `Subscribe`. An app
 * that controls `columnSizing` through `state` still re-renders, with the
 * sheet, on every resize: to own the widths, pass an atom in `atoms`, as
 * TanStack's column sizing guide recommends.
 */
export function useSheet<TData extends RowData>({
  cellStatus,
  rowChanges,
  ...options
}: UseSheetOptions<TData>) {
  // Cells report validation and save failures through this, so every sheet
  // has one, not only those that save per row.
  const ownCellStatus = useCellStatus();
  const table = useTable(
    {
      enableColumnResizing: true,
      columnResizeMode: 'onChange',
      ...defined(options),
      ...(options.state ? { state: defined(options.state) } : {}),
      features: sheetFeatures,
    },
    (state) => ({
      columnFilters: state.columnFilters,
      columnOrder: state.columnOrder,
      columnVisibility: state.columnVisibility,
      globalFilter: state.globalFilter,
      rowPinning: state.rowPinning,
      sorting: state.sorting,
    }),
  );

  return { table, cellStatus: cellStatus ?? ownCellStatus, rowChanges };
}

export type SheetInstance<TData extends RowData> = ReturnType<
  typeof useSheet<TData>
>;
