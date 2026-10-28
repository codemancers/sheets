import { PlusIcon } from './icons.js';

export type SheetAddRowProps = {
  gridTemplateColumns: string;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
};

/** The sticky footer row with the add button. */
export function SheetAddRow({
  gridTemplateColumns,
  onClick,
  disabled,
  label = 'Add row',
}: SheetAddRowProps) {
  return (
    <div
      role="row"
      className="sticky bottom-0 z-10 grid border-t border-t-zinc-950/10 bg-white hover:bg-zinc-50 dark:border-t-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      style={{ gridTemplateColumns }}
    >
      <div
        aria-hidden="true"
        className="border-r border-r-zinc-950/5 bg-zinc-950/2.5 dark:border-r-white/5 dark:bg-white/2.5"
      />
      <div role="cell" style={{ gridColumn: '2 / -1' }}>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-zinc-500 transition-colors hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white"
          aria-label={label}
        >
          <PlusIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
