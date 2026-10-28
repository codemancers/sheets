'use client';

import { cx } from './cx.js';

export type SheetLoadingProps = {
  gridTemplateColumns: string;
  rowCount?: number;
};

export function SheetLoading({
  gridTemplateColumns,
  rowCount = 6,
}: SheetLoadingProps) {
  const dataColumnCount = Math.max(
    0,
    gridTemplateColumns.trim().split(/\s+/).length - 2,
  );

  return (
    <div role="rowgroup" aria-busy="true" aria-live="polite">
      {Array.from({ length: rowCount }).map((_, idx) => (
        <div
          key={idx}
          role="row"
          className="grid animate-pulse"
          style={{ gridTemplateColumns, minHeight: '32px' }}
        >
          <div className="border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 bg-zinc-950/2.5 dark:border-r-white/5 dark:border-b-white/5 dark:bg-white/2.5" />
          {Array.from({ length: dataColumnCount }).map((_, cellIdx) => (
            <div
              key={cellIdx}
              className={cx(
                'border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 px-2 py-1.5 dark:border-r-white/5 dark:border-b-white/5',
                cellIdx === 0 && 'pl-2',
              )}
            >
              <div
                className={cx(
                  'h-3 rounded bg-zinc-200 dark:bg-zinc-700',
                  cellIdx % 3 === 0 && 'w-3/5',
                  cellIdx % 3 === 1 && 'w-1/2',
                  cellIdx % 3 === 2 && 'w-2/3',
                )}
              />
            </div>
          ))}
          <div className="border-b border-b-zinc-950/5 dark:border-b-white/5" />
        </div>
      ))}
    </div>
  );
}
