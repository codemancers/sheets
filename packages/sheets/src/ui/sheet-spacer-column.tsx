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
          ? 'border-b-zinc-950/10 dark:border-b-white/10'
          : 'border-b-zinc-950/5 dark:border-b-white/5',
        className,
      )}
    />
  );
}
