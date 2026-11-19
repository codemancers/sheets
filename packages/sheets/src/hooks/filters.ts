import {
  constructFilterFn,
  filterFn_includesString,
} from '@tanstack/react-table';

/**
 * Keeps the rows whose value contains the typed text, ignoring case: TanStack's
 * `includesString`. As a column's `filterFn`, it also gives the column's header
 * a text filter.
 */
export const textFilter = filterFn_includesString;

/**
 * Keeps the rows whose value is one of the picked values. As a column's
 * `filterFn`, it also gives the column's header a checklist of the column's
 * values, each with its number of rows.
 */
export const valuesFilter = constructFilterFn({
  filter: (value, picked: unknown[]) => picked.includes(value),
  // Nothing picked means no filter, not a sheet with every row hidden.
  autoRemove: (picked?: unknown[]) => !picked?.length,
});
