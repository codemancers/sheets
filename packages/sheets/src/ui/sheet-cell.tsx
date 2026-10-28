import { cx } from './cx.js';
import { Check, LoaderCircle, TriangleAlert } from './icons.js';
import type { ReactNode } from 'react';
import type { CellStatus, CellStatusState } from '../hooks/use-cell-status.js';
import type { RowChangesState } from '../hooks/use-row-changes.js';
import { SheetCellProvider } from './cell-context.js';

export type SheetCellProps = {
  children?: ReactNode;
  className?: string;
  isFirstCol?: boolean;
  isLastCol?: boolean;
  /** Identifies this cell to whatever is rendered inside it. */
  rowId?: string;
  columnId?: string;
  /** The whole status state, so a cell can report on itself. */
  cellStatus?: CellStatusState;
  /** Staging buffer, when the Sheet submits per row rather than per cell. */
  rowChanges?: RowChangesState;
  /**
   * Outcome of the last edit to this cell — a tick, or an icon whose popover
   * carries the error. Set it through `useCellStatus`.
   *
   * Deliberately no ring or fill: the icon is the signal, and tinting whole
   * cells turns a grid with a few bad values into a wall of red.
   */
  status?: CellStatus;
};

export function SheetCell({
  children,
  className,
  isFirstCol,
  isLastCol,
  status,
  rowId,
  columnId,
  cellStatus,
  rowChanges,
}: SheetCellProps) {
  return (
    <div
      role="cell"
      className={cx(
        'flex items-center border-r border-b border-r-zinc-950/5 border-b-zinc-950/5 dark:border-r-white/5 dark:border-b-white/5',
        isLastCol && 'border-r-0',
        isFirstCol && 'border-l border-l-zinc-950/5 dark:border-l-white/5',
        // Cell content truncates itself, so dropping the clip while a status is
        // showing is safe — and necessary, or the error popover is cut off.
        status ? 'relative overflow-visible' : 'overflow-hidden',
        className,
      )}
    >
      {rowId != null && columnId != null ? (
        <SheetCellProvider value={{ rowId, columnId, cellStatus, rowChanges }}>
          {children}
        </SheetCellProvider>
      ) : (
        children
      )}
      {status && <SheetCellStatus status={status} />}
    </div>
  );
}

/**
 * Pinned to the cell's right edge, and absolutely positioned rather than part of
 * the cell's flex row: content is often `w-full` (SheetPrimaryCell is), leaving
 * the indicator nowhere to sit. Opaque, so it masks anything beneath — including
 * the primary cell's hover actions, which keep their footprint at this edge.
 */
function SheetCellStatus({ status }: { status: CellStatus }) {
  // Deliberately quiet: a queued edit is normal, not a problem. A dot says
  // "not yet saved" without competing with the value being typed next door.
  if (status.kind === 'dirty') {
    return (
      <span
        role="status"
        className="absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center rounded bg-white p-0.5 dark:bg-zinc-900"
      >
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
        />
        <span className="sr-only">Unsaved</span>
      </span>
    );
  }

  if (status.kind === 'saving') {
    return (
      <span
        role="status"
        className="absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center rounded bg-white p-0.5 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
      >
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        <span className="sr-only">Saving</span>
      </span>
    );
  }

  if (status.kind === 'saved') {
    return (
      <span
        role="status"
        className="absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center rounded bg-white p-0.5 text-emerald-600 dark:bg-zinc-900 dark:text-emerald-400"
      >
        <Check className="size-4" aria-hidden="true" />
        <span className="sr-only">Saved</span>
      </span>
    );
  }

  return (
    <span className="group/cell-status absolute top-1/2 right-1 z-10 -translate-y-1/2">
      {/* Announced once when it lands: a sighted user sees the icon, but a
          screen-reader user would otherwise have to go hunting for it. */}
      <span role="alert" className="sr-only">
        {status.message}
      </span>
      <button
        type="button"
        // Labelled with the message itself, so focusing the icon re-reads it.
        aria-label={status.message}
        className="flex items-center rounded bg-white p-0.5 text-red-600 hover:bg-red-500/10 dark:bg-zinc-900 dark:text-red-400"
      >
        <TriangleAlert className="size-4" />
      </button>
      {/* The message is not inline: backend errors are whole sentences and a
          cell is only as wide as its column. */}
      <span
        // Visual only — the button above already carries the text for AT.
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-full right-0 z-20 mt-1 w-64 rounded-md bg-zinc-900 px-2 py-1.5 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity group-focus-within/cell-status:visible group-focus-within/cell-status:opacity-100 group-hover/cell-status:visible group-hover/cell-status:opacity-100 dark:bg-zinc-700"
      >
        {status.message}
      </span>
    </span>
  );
}
