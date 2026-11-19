'use client';

import { PlusIcon } from './icons.js';
import { sheetGrid } from './grid.js';
import { useSheetLabels } from './labels.js';

export type SheetAddRowProps = {
  onClick: () => void;
  disabled?: boolean;
  /** Defaults to the `addRow` label. */
  label?: string;
};

/**
 * The row with the add button, right below the last row. The button sits in
 * the row-number column, where the next row's number would be.
 */
export function SheetAddRow({ onClick, disabled, label }: SheetAddRowProps) {
  const labels = useSheetLabels();
  return (
    <div role="row" className="grid" style={sheetGrid}>
      <div
        role="cell"
        className="border-e border-e-sheet-fg/5 bg-sheet-fg/2.5 dark:border-e-sheet-fg-dark/5 dark:bg-sheet-fg-dark/2.5"
      >
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex size-full items-center justify-center py-1.5 text-sheet-muted transition-colors hover:bg-sheet-fg/5 hover:text-sheet-fg disabled:cursor-not-allowed disabled:opacity-50 dark:text-sheet-muted-dark dark:hover:bg-sheet-fg-dark/5 dark:hover:text-sheet-fg-dark"
          aria-label={label ?? labels.addRow}
        >
          <PlusIcon className="size-5" />
        </button>
      </div>
      <div aria-hidden="true" style={{ gridColumn: '2 / -1' }} />
    </div>
  );
}
