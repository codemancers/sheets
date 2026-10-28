import { cx } from './cx.js';

export type SheetRowNumberProps = {
  label?: string | number;
  className?: string;
};

export function SheetRowNumber({ label, className }: SheetRowNumberProps) {
  return (
    <div
      role="rowheader"
      className={cx(
        'flex items-center justify-center border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 bg-zinc-950/2.5 text-xs text-zinc-500 select-none dark:border-r-white/5 dark:border-b-white/5 dark:bg-white/2.5 dark:text-zinc-400',
        className,
      )}
    >
      {label ?? ''}
    </div>
  );
}
