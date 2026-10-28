'use client';

import type { ReactNode } from 'react';
import { sheetGrid } from './grid.js';
import { useSheetLabels } from './labels.js';

export type SheetEmptyProps = {
  /** Defaults to the `empty` label. */
  children?: ReactNode;
};

export function SheetEmpty({ children }: SheetEmptyProps) {
  const labels = useSheetLabels();
  return (
    <div role="row" className="grid" style={sheetGrid}>
      <div
        aria-hidden="true"
        className="border-e border-b border-e-sheet-fg/5 border-b-sheet-fg/5 bg-sheet-fg/2.5 dark:border-e-sheet-fg-dark/5 dark:border-b-sheet-fg-dark/5 dark:bg-sheet-fg-dark/2.5"
      />
      <div
        role="cell"
        style={{ gridColumn: `2 / -1` }}
        className="border-b border-b-sheet-fg/5 px-2 py-8 text-center text-sm text-sheet-muted dark:border-b-sheet-fg-dark/5 dark:text-sheet-muted-dark"
      >
        {children ?? labels.empty}
      </div>
    </div>
  );
}
