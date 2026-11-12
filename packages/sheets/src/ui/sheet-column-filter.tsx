'use client';

import { useId, useRef, useState } from 'react';
import type { Column } from '@tanstack/react-table';
import { textFilter, valuesFilter } from '../hooks/filters.js';
import { cx } from './cx.js';
import { FunnelIcon } from './icons.js';
import { useSheetLabels } from './labels.js';

type FilterKind = 'text' | 'values';

/** The filter control a column asked for through its `filterFn`, if any. */
export function columnFilterKind<TData>(
  column: Column<TData, unknown>,
): FilterKind | undefined {
  if (!column.getCanFilter()) return undefined;
  const { filterFn } = column.columnDef;
  if (filterFn === textFilter) return 'text';
  if (filterFn === valuesFilter) return 'values';
  return undefined;
}

type SheetColumnFilterProps<TData> = {
  column: Column<TData, unknown>;
  kind: FilterKind;
  /** The column's name, as in "Filter Title". */
  label: string;
};

/**
 * A header's filter: a funnel button, and the panel it opens with the column's
 * filter control. The panel is a native popover, so it sits above the sheet's
 * scroll container instead of being clipped by it, and the browser closes it
 * on a click outside and returns focus to the button. CSS anchor positioning
 * places it under the button, mirrored in right-to-left layouts.
 */
export function SheetColumnFilter<TData>({
  column,
  kind,
  label,
}: SheetColumnFilterProps<TData>) {
  const labels = useSheetLabels();
  const id = useId();
  // Anchor names are CSS dashed idents, which can't hold useId's punctuation.
  const anchor = `--sheet-filter-${id.replace(/[^\w-]/g, '')}`;
  const panel = useRef<HTMLDivElement>(null);
  // The controls mount only while the panel is open: a values filter counts
  // its column's values then, and autoFocus moves focus into the panel.
  const [open, setOpen] = useState(false);
  const filtered = column.getIsFiltered();
  const name = labels.filter(label);
  const close = () => panel.current?.hidePopover();

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={name}
        style={{ anchorName: anchor }}
        className={cx(
          filtered
            ? 'text-sheet-accent'
            : 'text-sheet-fg/30 hover:text-sheet-fg dark:text-sheet-fg-dark/30 dark:hover:text-sheet-fg-dark',
          open || filtered
            ? 'opacity-100'
            : 'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <FunnelIcon className="size-3" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={name}
        onToggle={(event) => setOpen(event.newState === 'open')}
        onKeyDown={(event) => {
          // Closed here and marked handled, so an Escape handler further out,
          // such as a drawer's, leaves its own state alone.
          if (event.key !== 'Escape') return;
          event.preventDefault();
          close();
        }}
        style={{
          positionAnchor: anchor,
          positionArea: 'block-end span-inline-start',
          positionTryFallbacks: 'flip-inline',
        }}
        className="inset-auto m-0 mt-1 w-56 rounded-md border border-sheet-fg/10 bg-sheet-raised p-2 text-sm font-normal text-sheet-fg shadow-lg dark:border-sheet-fg-dark/10 dark:bg-sheet-raised-dark dark:text-sheet-fg-dark"
      >
        {open && (
          <>
            {kind === 'text' ? (
              <TextFilter column={column} label={label} close={close} />
            ) : (
              <ValuesFilter column={column} />
            )}
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  column.setFilterValue(undefined);
                  close();
                }}
                className="mt-2 text-xs text-sheet-link hover:text-sheet-link-hover dark:text-sheet-link-dark dark:hover:text-sheet-link-hover-dark"
              >
                {labels.clearFilter}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

function TextFilter<TData>({
  column,
  label,
  close,
}: {
  column: Column<TData, unknown>;
  label: string;
  close: () => void;
}) {
  const labels = useSheetLabels();
  const name = labels.filterText(label);
  return (
    <input
      type="text"
      autoFocus
      aria-label={name}
      placeholder={name}
      value={String(column.getFilterValue() ?? '')}
      onChange={(event) => column.setFilterValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        // Closing returns focus to the filter button, and the Enter's keypress
        // would then press it, opening the panel again.
        event.preventDefault();
        close();
      }}
      className="w-full rounded border border-sheet-fg/15 bg-sheet-bg px-2 py-1 text-sm text-sheet-fg outline-none placeholder:text-sheet-faint focus:border-sheet-accent dark:border-sheet-fg-dark/15 dark:bg-sheet-bg-dark dark:text-sheet-fg-dark dark:placeholder:text-sheet-faint-dark"
    />
  );
}

function ValuesFilter<TData>({ column }: { column: Column<TData, unknown> }) {
  const labels = useSheetLabels();
  const value = column.getFilterValue();
  const picked = Array.isArray(value) ? value : [];
  // Counted with every other column's filter applied, but not this one's.
  const counts = new Map(column.getFacetedUniqueValues());
  // A picked value that the other filters have hidden stays listed, or this
  // filter could hide itself.
  for (const item of picked) if (!counts.has(item)) counts.set(item, 0);
  const options = [...counts]
    .map(([item, count]) => ({
      item,
      count,
      text: item == null || item === '' ? labels.blank : String(item),
    }))
    .sort((a, b) => a.text.localeCompare(b.text, undefined, { numeric: true }));

  return (
    <ul className="-mx-2 max-h-64 overflow-y-auto">
      {options.map(({ item, count, text }, index) => (
        <li key={index}>
          <label className="flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-sheet-fg/5 dark:hover:bg-sheet-fg-dark/5">
            <input
              type="checkbox"
              autoFocus={index === 0}
              checked={picked.includes(item)}
              onChange={() =>
                column.setFilterValue(
                  picked.includes(item)
                    ? picked.filter((other) => other !== item)
                    : [...picked, item],
                )
              }
              className="accent-sheet-accent"
            />
            <span className="min-w-0 flex-1 truncate">{text}</span>{' '}
            <span className="text-xs text-sheet-muted tabular-nums dark:text-sheet-muted-dark">
              {count}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
