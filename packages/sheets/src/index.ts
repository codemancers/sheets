export * from './hooks/index.js';

// Re-exported so consumers render and type their columns without
// installing TanStack Table themselves.
export { flexRender } from '@tanstack/react-table';
export type {
  CellContext,
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  Header,
  OnChangeFn,
  PaginationState,
  Row,
  SortingState,
  Table,
  Updater,
  VisibilityState,
} from '@tanstack/react-table';
