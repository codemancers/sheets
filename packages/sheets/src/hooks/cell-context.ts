'use client';

import { createContext, useContext } from 'react';
import type { CellStatusState } from './use-cell-status.js';
import type { RowChangesState } from './use-row-changes.js';

/**
 * Lets a cell report on itself without the consumer wiring row and column ids
 * into every editable cell it renders. `SheetCell` knows both, and the Sheet
 * holds the status, so the pair is provided here and picked up by whichever cell
 * is rendered inside.
 *
 * Absent when a cell is rendered outside a Sheet (tests, docs), so consumers of
 * this context must tolerate undefined and fall back to their own props.
 */
export type SheetCellScope = {
  rowId: string;
  columnId: string;
  /** The column's header text, which names the cell's editor. */
  columnLabel?: string;
  cellStatus?: CellStatusState;
  /**
   * Present when the Sheet stages writes rather than letting each cell perform
   * its own. A cell then hands its committed value here instead of calling the
   * consumer's `onCommit`.
   */
  rowChanges?: RowChangesState;
};

const SheetCellContext = createContext<SheetCellScope | undefined>(undefined);

export const SheetCellProvider = SheetCellContext.Provider;

export function useSheetCellScope() {
  return useContext(SheetCellContext);
}
