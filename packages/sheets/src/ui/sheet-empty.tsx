import type { ReactNode } from 'react';

export type SheetEmptyProps = {
  gridTemplateColumns: string;
  children?: ReactNode;
};

export function SheetEmpty({
  gridTemplateColumns,
  children = 'No data.',
}: SheetEmptyProps) {
  return (
    <div role="row" className="grid" style={{ gridTemplateColumns }}>
      <div className="border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 bg-zinc-950/2.5 dark:border-r-white/5 dark:border-b-white/5 dark:bg-white/2.5" />
      <div
        style={{ gridColumn: `2 / -1` }}
        className="border-b border-b-zinc-950/5 px-2 py-8 text-center text-sm text-zinc-500 dark:border-b-white/5 dark:text-zinc-400"
      >
        {children}
      </div>
    </div>
  );
}
