import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from './icons.js';
import { cx } from './cx.js';
import { flexRender, type Header } from '@tanstack/react-table';

/** Pixels per arrow key on the resize handle; Shift moves five steps. */
const RESIZE_STEP = 10;

export type SheetColumnProps<TData> = {
  header: Header<TData, unknown>;
  isFirstCol?: boolean;
  className?: string;
};

export function SheetColumn<TData>({
  header,
  isFirstCol,
  className,
}: SheetColumnProps<TData>) {
  const column = header.column;
  // Group headers span their leaf columns; empty slots above a leaf column
  // that has no group (placeholders) render as blank header space.
  const span =
    header.colSpan > 1 ? { gridColumn: `span ${header.colSpan}` } : undefined;
  const borders = cx(
    'border-r border-b border-r-zinc-950/5 border-b-zinc-950/10 dark:border-r-white/5 dark:border-b-white/10',
    isFirstCol && 'border-l border-l-zinc-950/5 dark:border-l-white/5',
  );

  if (header.isPlaceholder) {
    return <div aria-hidden="true" style={span} className={borders} />;
  }

  // For names like "Sort Title": the header itself may render anything.
  const label =
    typeof column.columnDef.header === 'string'
      ? column.columnDef.header
      : column.id;
  const isLeaf = header.subHeaders.length === 0;

  const sort = column.getIsSorted();
  const canSort = column.getCanSort();
  const size = header.getSize();
  const minSize = column.columnDef.minSize ?? 0;

  const resizeBy = (delta: number) =>
    header.getContext().table.setColumnSizing((sizing) => ({
      ...sizing,
      [column.id]: Math.max(minSize, size + delta),
    }));

  return (
    <div
      role="columnheader"
      style={span}
      aria-sort={
        sort === 'asc'
          ? 'ascending'
          : sort === 'desc'
            ? 'descending'
            : canSort
              ? 'none'
              : undefined
      }
      className={cx(
        'group relative flex items-center justify-between px-2 py-1.5 text-xs font-medium text-zinc-500 select-none dark:text-zinc-400',
        borders,
        className,
      )}
    >
      <div className="flex items-center gap-1 uppercase">
        <span className="truncate">
          {flexRender(column.columnDef.header, header.getContext())}
        </span>
        {sort === 'asc' && <ChevronUpIcon className="size-3" />}
        {sort === 'desc' && <ChevronDownIcon className="size-3" />}
        {column.getIsFiltered() && (
          <>
            <FunnelIcon className="size-3" />
            <span className="sr-only">(filtered)</span>
          </>
        )}
      </div>
      {canSort && (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="text-zinc-950/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-950 focus-visible:opacity-100 dark:text-white/30 dark:hover:text-white"
          aria-label={`Sort ${label}`}
        >
          <ArrowsUpDownIcon className="size-3" />
        </button>
      )}
      {isLeaf && column.getCanResize() && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          aria-valuenow={size}
          aria-valuemin={minSize}
          aria-valuetext={`${size} pixels`}
          tabIndex={0}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onDoubleClick={() => column.resetSize()}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const step = event.shiftKey ? RESIZE_STEP * 5 : RESIZE_STEP;
            resizeBy(event.key === 'ArrowRight' ? step : -step);
          }}
          className={cx(
            'absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none outline-none select-none focus-visible:bg-blue-500',
            column.getIsResizing()
              ? 'bg-blue-500'
              : 'hover:bg-zinc-950/20 dark:hover:bg-white/20',
          )}
        />
      )}
    </div>
  );
}
