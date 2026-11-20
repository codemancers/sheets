'use client';

import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from './icons.js';
import { cx } from './cx.js';
import {
  flexRender,
  Subscribe,
  type Header,
  type RowData,
} from '@tanstack/react-table';
import type { SheetFeatures } from '../hooks/use-sheet.js';
import { useSheetLabels } from './labels.js';
import { columnFilterKind, SheetColumnFilter } from './sheet-column-filter.js';

/** Pixels per arrow key on the resize handle; Shift moves five steps. */
const RESIZE_STEP = 10;

export type SheetColumnProps<TData extends RowData> = {
  header: Header<SheetFeatures, TData, unknown>;
  isFirstCol?: boolean;
  className?: string;
};

export function SheetColumn<TData extends RowData>({
  header,
  isFirstCol,
  className,
}: SheetColumnProps<TData>) {
  const labels = useSheetLabels();
  const column = header.column;
  // Group headers span their leaf columns; empty slots above a leaf column
  // that has no group (placeholders) render as blank header space.
  const span =
    header.colSpan > 1 ? { gridColumn: `span ${header.colSpan}` } : undefined;
  const borders = cx(
    'border-e border-b border-e-sheet-fg/5 border-b-sheet-fg/10 dark:border-e-sheet-fg-dark/5 dark:border-b-sheet-fg-dark/10',
    isFirstCol && 'border-s border-s-sheet-fg/5 dark:border-s-sheet-fg-dark/5',
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
  const filterKind = columnFilterKind(column);
  const table = header.getContext().table;
  const minSize = column.columnDef.minSize ?? 0;

  // The width when the key is pressed: resizing doesn't re-render this header.
  const resizeBy = (delta: number) =>
    table.setColumnSizing((sizing) => ({
      ...sizing,
      [column.id]: Math.max(minSize, header.getSize() + delta),
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
        'group relative flex items-center justify-between px-2 py-1.5 text-xs font-medium text-sheet-muted select-none dark:text-sheet-muted-dark',
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
            {/* A column with a filter control shows this on its button. */}
            {!filterKind && <FunnelIcon className="size-3" />}
            <span className="sr-only">{labels.filtered}</span>
          </>
        )}
      </div>
      {(canSort || filterKind) && (
        <div className="flex shrink-0 items-center gap-1">
          {canSort && (
            <button
              type="button"
              onClick={column.getToggleSortingHandler()}
              className="text-sheet-fg/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-sheet-fg focus-visible:opacity-100 dark:text-sheet-fg-dark/30 dark:hover:text-sheet-fg-dark"
              aria-label={labels.sort(label)}
            >
              <ArrowsUpDownIcon className="size-3" />
            </button>
          )}
          {filterKind && (
            <SheetColumnFilter
              column={column}
              kind={filterKind}
              label={label}
            />
          )}
        </div>
      )}
      {isLeaf && column.getCanResize() && (
        // Only the handle follows a resize, for its width and highlight:
        // TanStack's advice for resizing. A header's `table` is the core
        // table, so this is the standalone `Subscribe`.
        <Subscribe
          source={table.store}
          selector={(state) => ({
            width: state.columnSizing[column.id],
            resizing: state.columnResizing.isResizingColumn === column.id,
          })}
        >
          {({ resizing }) => {
            const size = header.getSize();
            return (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={labels.resize(label)}
                aria-valuenow={size}
                aria-valuemin={minSize}
                aria-valuetext={labels.width(size)}
                tabIndex={0}
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                onDoubleClick={() => column.resetSize()}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                    return;
                  event.preventDefault();
                  // The arrow pointing away from the column widens it, so
                  // the keys flip in right-to-left layouts.
                  const widen =
                    table.options.columnResizeDirection === 'rtl'
                      ? 'ArrowLeft'
                      : 'ArrowRight';
                  const step = event.shiftKey ? RESIZE_STEP * 5 : RESIZE_STEP;
                  resizeBy(event.key === widen ? step : -step);
                }}
                className={cx(
                  'absolute top-0 end-0 h-full w-1 cursor-col-resize touch-none outline-none select-none focus-visible:bg-sheet-accent',
                  resizing
                    ? 'bg-sheet-accent'
                    : 'hover:bg-sheet-fg/20 dark:hover:bg-sheet-fg-dark/20',
                )}
              />
            );
          }}
        </Subscribe>
      )}
    </div>
  );
}
