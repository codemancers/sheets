import { cx } from './cx.js';

export type SheetLoadingProps = {
  gridTemplateColumns: string;
  rowCount?: number;
  rowHeight?: number;
};

/**
 * Placeholder rows while the data loads. Hidden from assistive tech: the
 * Sheet marks its rows busy rather than exposing rows of empty cells.
 */
export function SheetLoading({
  gridTemplateColumns,
  rowCount = 6,
  rowHeight = 32,
}: SheetLoadingProps) {
  const dataColumnCount = Math.max(
    0,
    gridTemplateColumns.trim().split(/\s+/).length - 2,
  );

  return (
    <div aria-hidden="true">
      {Array.from({ length: rowCount }).map((_, idx) => (
        <div
          key={idx}
          className="grid animate-pulse"
          style={{ gridTemplateColumns, minHeight: `${rowHeight}px` }}
        >
          <div className="border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 bg-zinc-950/2.5 dark:border-r-white/5 dark:border-b-white/5 dark:bg-white/2.5" />
          {Array.from({ length: dataColumnCount }).map((_, cellIdx) => (
            <div
              key={cellIdx}
              className="border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 px-2 py-1.5 dark:border-r-white/5 dark:border-b-white/5"
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
