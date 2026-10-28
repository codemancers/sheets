import { cx } from './cx.js';
import { sheetGrid } from './grid.js';

export type SheetLoadingProps = {
  /** How many data columns to draw placeholders for. */
  columnCount: number;
  rowCount?: number;
  rowHeight?: number;
};

/**
 * Placeholder rows while the data loads. Hidden from assistive tech: the
 * Sheet marks its rows busy rather than exposing rows of empty cells.
 */
export function SheetLoading({
  columnCount,
  rowCount = 6,
  rowHeight = 32,
}: SheetLoadingProps) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rowCount }).map((_, idx) => (
        <div
          key={idx}
          className="grid animate-pulse"
          style={{ ...sheetGrid, minHeight: `${rowHeight}px` }}
        >
          <div className="border-e border-b border-e-sheet-fg/5 border-b-sheet-fg/5 bg-sheet-fg/2.5 dark:border-e-sheet-fg-dark/5 dark:border-b-sheet-fg-dark/5 dark:bg-sheet-fg-dark/2.5" />
          {Array.from({ length: columnCount }).map((_, cellIdx) => (
            <div
              key={cellIdx}
              className="border-e border-b border-e-sheet-fg/5 border-b-sheet-fg/5 px-2 py-1.5 dark:border-e-sheet-fg-dark/5 dark:border-b-sheet-fg-dark/5"
            >
              <div
                className={cx(
                  'h-3 rounded bg-sheet-skeleton dark:bg-sheet-skeleton-dark',
                  cellIdx % 3 === 0 && 'w-3/5',
                  cellIdx % 3 === 1 && 'w-1/2',
                  cellIdx % 3 === 2 && 'w-2/3',
                )}
              />
            </div>
          ))}
          <div className="border-b border-b-sheet-fg/5 dark:border-b-sheet-fg-dark/5" />
        </div>
      ))}
    </div>
  );
}
