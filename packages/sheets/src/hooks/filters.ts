import { filterFns } from '@tanstack/react-table';

/**
 * Typed like TanStack's own filter functions, which take rows of any type, so
 * one function fits every table's columns.
 */
type SheetFilterFn = typeof filterFns.equals;

/**
 * Keeps the rows whose value contains the typed text, ignoring case: TanStack's
 * `includesString`. As a column's `filterFn`, it also gives the column's header
 * a text filter.
 */
export const textFilter: SheetFilterFn = filterFns.includesString;

/**
 * Keeps the rows whose value is one of the picked values. As a column's
 * `filterFn`, it also gives the column's header a checklist of the column's
 * values, each with its number of rows.
 */
export const valuesFilter: SheetFilterFn = (row, columnId, picked: unknown[]) =>
  picked.includes(row.getValue(columnId));
// Nothing picked means no filter, not a sheet with every row hidden.
valuesFilter.autoRemove = (picked?: unknown[]) => !picked?.length;
