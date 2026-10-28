import type { ColumnDef } from '@tanstack/react-table';
import type { SheetColumn } from './types.js';

export function defineSheetColumn<TData>(
  column: SheetColumn<TData>,
): SheetColumn<TData> {
  return column;
}

export function toTanStackColumn<TData>(
  column: SheetColumn<TData>,
): ColumnDef<TData, unknown> {
  // TanStack's `ColumnDef` is a union — `accessorFn` lives on one variant
  // and `accessorKey` on another, neither on the display-only variant. We
  // pick the shape upfront based on `column.accessor` instead of mutating
  // a base object, which the union's narrowing would reject.
  const base = {
    id: column.id,
    header: column.header,
    size: column.width,
    enableSorting: column.sortable ?? false,
    enableColumnFilter: column.filterable ?? false,
    enableResizing: true,
    ...(column.cell ? { cell: column.cell } : {}),
  } as const;

  if (!column.accessor) {
    return base as ColumnDef<TData, unknown>;
  }
  if (typeof column.accessor === 'function') {
    return {
      ...base,
      accessorFn: column.accessor as (row: TData) => unknown,
    } as ColumnDef<TData, unknown>;
  }
  return {
    ...base,
    accessorKey: column.accessor as string,
  } as ColumnDef<TData, unknown>;
}
