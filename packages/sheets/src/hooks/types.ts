import type { ReactNode } from 'react';
import type {
  CellContext,
  ColumnFiltersState,
  ColumnSizingState,
  PaginationState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

/**
 * Validation rule for an editable cell — anything with zod's `safeParse` shape.
 *
 * Structural on purpose: the package takes no zod dependency and knows nothing
 * about any domain, while a zod schema satisfies this as-is. `value` is
 * `unknown`, so this works for a numeric or date cell exactly as it does for
 * text.
 */
export type SheetCellValidator = {
  safeParse: (
    value: unknown,
  ) =>
    | { success: true }
    | { success: false; error?: { issues?: readonly { message?: string }[] } };
};

export type SheetColumn<TData> = {
  id: string;
  header: string;
  accessor?: keyof TData | ((row: TData) => unknown);
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  cell?: (ctx: CellContext<TData, unknown>) => ReactNode;
};

export type SheetState = {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  pagination?: PaginationState;
  columnSizing?: ColumnSizingState;
  columnOrder?: string[];
  columnVisibility?: VisibilityState;
  rowHeight?: number;
};

export type SheetStateChange = {
  onSortingChange?: (state: SortingState) => void;
  onColumnFiltersChange?: (state: ColumnFiltersState) => void;
  onPaginationChange?: (state: PaginationState) => void;
  onColumnSizingChange?: (state: ColumnSizingState) => void;
  onColumnOrderChange?: (state: string[]) => void;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
};
