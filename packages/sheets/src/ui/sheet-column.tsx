import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from './icons.js';
import { cx } from './cx.js';
import type { Header } from '@tanstack/react-table';

export type SheetColumnProps<TData> = {
  header: Header<TData, unknown>;
  isFirstCol?: boolean;
  isLastCol?: boolean;
  className?: string;
};

export function SheetColumn<TData>({
  header,
  isFirstCol,
  isLastCol,
  className,
}: SheetColumnProps<TData>) {
  const column = header.column;
  const label =
    typeof column.columnDef.header === 'string'
      ? column.columnDef.header
      : column.id;

  const sort = column.getIsSorted();
  const canSort = column.getCanSort();
  const isFiltered = column.getIsFiltered();
  const canFilter = column.getCanFilter();

  return (
    <div
      role="columnheader"
      className={cx(
        'group relative flex items-center justify-between border-r border-b border-r-zinc-950/5 border-b-zinc-950/10 px-2 py-1.5 text-xs font-medium text-zinc-500 select-none dark:border-r-white/5 dark:border-b-white/10 dark:text-zinc-400',
        isLastCol && 'border-r-0',
        isFirstCol && 'border-l border-l-zinc-950/5 dark:border-l-white/5',
        className,
      )}
    >
      <div className="flex items-center gap-1 uppercase">
        <span className="truncate">{label}</span>
        {sort === 'asc' && <ChevronUpIcon className="size-3" />}
        {sort === 'desc' && <ChevronDownIcon className="size-3" />}
        {isFiltered && <FunnelIcon className="size-3" />}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {canSort && (
          <button
            type="button"
            onClick={column.getToggleSortingHandler()}
            className="text-zinc-950/30 hover:text-zinc-950 dark:text-white/30 dark:hover:text-white"
            aria-label={`Sort ${label}`}
          >
            <ArrowsUpDownIcon className="size-3" />
          </button>
        )}
        {canFilter && (
          <button
            type="button"
            className="text-zinc-950/30 hover:text-zinc-950 dark:text-white/30 dark:hover:text-white"
            aria-label={`Filter ${label}`}
          >
            <FunnelIcon className="size-3" />
          </button>
        )}
      </div>
      {column.getCanResize() && (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cx(
            'absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none',
            header.column.getIsResizing()
              ? 'bg-blue-500'
              : 'hover:bg-zinc-950/20 dark:hover:bg-white/20',
          )}
        />
      )}
    </div>
  );
}
