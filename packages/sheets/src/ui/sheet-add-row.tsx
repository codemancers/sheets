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

/** The sticky footer row with the add button. */
export function SheetAddRow({ onClick, disabled, label }: SheetAddRowProps) {
  const labels = useSheetLabels();
  return (
    <div
      role="row"
      className="sticky bottom-0 z-10 grid border-t border-t-sheet-fg/10 bg-sheet-bg hover:bg-sheet-raised dark:border-t-sheet-fg-dark/10 dark:bg-sheet-bg-dark dark:hover:bg-sheet-raised-dark"
      style={sheetGrid}
    >
      <div
        aria-hidden="true"
        className="border-e border-e-sheet-fg/5 bg-sheet-fg/2.5 dark:border-e-sheet-fg-dark/5 dark:bg-sheet-fg-dark/2.5"
      />
      <div role="cell" style={{ gridColumn: '2 / -1' }}>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex w-full items-center gap-1 px-2 py-1.5 text-start text-sheet-muted transition-colors hover:text-sheet-fg disabled:cursor-not-allowed disabled:opacity-50 dark:text-sheet-muted-dark dark:hover:text-sheet-fg-dark"
          aria-label={label ?? labels.addRow}
        >
          <PlusIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
