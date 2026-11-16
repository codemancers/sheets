'use client';

import { createContext, useContext } from 'react';

/** Text the sheet renders itself. Override any of it through `Sheet`'s `labels`. */
export type SheetLabels = {
  /** Names the row-number column for assistive tech. */
  rowNumber: string;
  /** Names a header's sort button. */
  sort: (column: string) => string;
  /** Names a header's resize handle. */
  resize: (column: string) => string;
  /** Reads out a column's width. */
  width: (pixels: number) => string;
  /** Announced on a filtered column's header. */
  filtered: string;
  /** Names a header's filter button, and the filter it opens. */
  filter: (column: string) => string;
  /** Names a text filter's input, and is its placeholder. */
  filterText: (column: string) => string;
  /** Stands for an empty value in a filter's checklist. */
  blank: string;
  /** Clears one column's filter. */
  clearFilter: string;
  /** Shown when the filters leave no rows. */
  noMatches: string;
  /** Clears every column's filter. */
  clearFilters: string;
  /** Cell status, announced to assistive tech. */
  unsaved: string;
  saving: string;
  saved: string;
  /** Shown on a cell when its `onCommit` throws, such as a failed request. */
  saveFailed: string;
  /** Shown when there are no rows and no `emptyState`. */
  empty: string;
  /** Names the add-row button. */
  addRow: string;
};

export const defaultSheetLabels: SheetLabels = {
  rowNumber: 'Row',
  sort: (column) => `Sort ${column}`,
  resize: (column) => `Resize ${column}`,
  width: (pixels) => `${pixels} pixels`,
  filtered: '(filtered)',
  filter: (column) => `Filter ${column}`,
  filterText: (column) => `${column} contains`,
  blank: '(Blank)',
  clearFilter: 'Clear',
  noMatches: 'No rows match the filters.',
  clearFilters: 'Clear filters',
  unsaved: 'Unsaved',
  saving: 'Saving',
  saved: 'Saved',
  saveFailed: 'Could not save. Check your connection.',
  empty: 'No data.',
  addRow: 'Add row',
};

const SheetLabelsContext = createContext<SheetLabels>(defaultSheetLabels);

export const SheetLabelsProvider = SheetLabelsContext.Provider;

export function useSheetLabels() {
  return useContext(SheetLabelsContext);
}
