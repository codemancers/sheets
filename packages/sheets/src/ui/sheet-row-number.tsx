'use client';

import { cx } from './cx.js';
import { useSheetLabels } from './labels.js';

export type SheetRowNumberProps = {
  label?: string | number;
  className?: string;
  /** The header row's corner cell, which heads the row-number column. */
  isHeader?: boolean;
};

export function SheetRowNumber({
  label,
  className,
  isHeader,
}: SheetRowNumberProps) {
  const labels = useSheetLabels();
  return (
    <div
      role={isHeader ? 'columnheader' : 'rowheader'}
      className={cx(
        'flex items-center justify-center border-e border-b border-e-sheet-fg/5 border-b-sheet-fg/5 bg-sheet-fg/2.5 text-xs text-sheet-muted select-none dark:border-e-sheet-fg-dark/5 dark:border-b-sheet-fg-dark/5 dark:bg-sheet-fg-dark/2.5 dark:text-sheet-muted-dark',
        className,
      )}
    >
      {isHeader ? (
        <span className="sr-only">{labels.rowNumber}</span>
      ) : (
        (label ?? '')
      )}
    </div>
  );
}
