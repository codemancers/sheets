import type { ReactNode } from 'react';
import type {
  ColumnFiltersState,
  ColumnSizingState,
  PaginationState,
  SortingState,
  VisibilityState,
  CellContext,
  Row,
} from '@tanstack/react-table';

export type TableKey =
  'projects.list' | 'tasks.list' | 'sprints.list' | 'meetings.list';

export type TableUrlState = {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  pagination?: PaginationState;
};

export type TableConfig = {
  columnSizing?: ColumnSizingState;
  columnOrder?: string[];
  columnVisibility?: VisibilityState;
  rowHeight?: number;
};

export type SheetColumnType =
  | 'text'
  | 'editableText'
  | 'link'
  | 'select'
  | 'date'
  | 'number'
  | 'badge'
  | 'actions';

/**
 * Validation rule for an editable cell — anything with zod's `safeParse` shape.
 *
 * Structural on purpose: ui-kit takes no zod dependency and knows nothing about
 * any domain, while a zod schema satisfies this as-is. `value` is `unknown`, so
 * this works for a numeric or date cell exactly as it does for text.
 */
export type SheetCellValidator = {
  safeParse: (
    value: unknown,
  ) =>
    | { success: true }
    | { success: false; error?: { issues?: readonly { message?: string }[] } };
};

export type SheetSelectOption = {
  value: string;
  label: string;
};

export type SheetColumn<TData> = {
  id: string;
  header: string;
  accessor?: keyof TData | ((row: TData) => unknown);
  type: SheetColumnType;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  options?: SheetSelectOption[];
  href?: (row: TData) => string;
  cell?: (ctx: CellContext<TData, unknown>) => ReactNode;
  onCommit?: (row: TData, value: unknown) => void;
  placeholder?: string;
};

export type SheetRowAction<TData> = {
  label: string;
  icon?: ReactNode;
  onClick: (row: TData) => void;
  variant?: 'default' | 'danger';
};

export type SheetState = TableUrlState & TableConfig;

export type SheetStateChange = {
  onSortingChange?: (state: SortingState) => void;
  onColumnFiltersChange?: (state: ColumnFiltersState) => void;
  onPaginationChange?: (state: PaginationState) => void;
  onColumnSizingChange?: (state: ColumnSizingState) => void;
  onColumnOrderChange?: (state: string[]) => void;
  onColumnVisibilityChange?: (state: VisibilityState) => void;
  onRowHeightChange?: (height: number) => void;
};

export type SheetRowContext<TData> = {
  row: Row<TData>;
  rowIndex: number;
  isNew: boolean;
};
