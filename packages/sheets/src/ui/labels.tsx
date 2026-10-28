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
  /** Cell status, announced to assistive tech. */
  unsaved: string;
  saving: string;
  saved: string;
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
  unsaved: 'Unsaved',
  saving: 'Saving',
  saved: 'Saved',
  empty: 'No data.',
  addRow: 'Add row',
};

const SheetLabelsContext = createContext<SheetLabels>(defaultSheetLabels);

export const SheetLabelsProvider = SheetLabelsContext.Provider;

export function useSheetLabels() {
  return useContext(SheetLabelsContext);
}
