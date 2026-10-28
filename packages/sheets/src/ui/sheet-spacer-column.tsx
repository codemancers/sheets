import { cx } from './cx.js';

export type SheetSpacerColumnProps = {
  className?: string;
  isHeader?: boolean;
};

export function SheetSpacerColumn({
  className,
  isHeader,
}: SheetSpacerColumnProps) {
  return (
    <div
      role="cell"
      aria-hidden="true"
      className={cx(
        'border-b',
        isHeader
          ? 'border-b-sheet-fg/10 dark:border-b-sheet-fg-dark/10'
          : 'border-b-sheet-fg/5 dark:border-b-sheet-fg-dark/5',
        className,
      )}
    />
  );
}
