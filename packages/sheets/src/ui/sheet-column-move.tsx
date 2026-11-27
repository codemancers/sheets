'use client';

import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { Column, Header, RowData, Table } from '@tanstack/react-table';
import type { SheetFeatures } from '../hooks/use-sheet.js';
import { columnLabel, moveColumn, type MoveSide } from './column-order.js';
import { cx } from './cx.js';
import { GripVertical } from './icons.js';
import { useSheetLabels } from './labels.js';

/**
 * The id of the column being dragged in this header, so a header in another
 * sheet doesn't take the drop. `SheetHeader` provides one per sheet.
 */
export const DraggedColumnContext = createContext<RefObject<string | null>>({
  current: null,
});

/**
 * Announces a move to screen readers. `Sheet` provides it, with its live
 * region; the message is read when it's announced, after the move renders.
 */
export const AnnounceContext = createContext<(message: () => string) => void>(
  () => undefined,
);

/** Moves a column next to another, and announces where it went. */
export function useMoveColumn() {
  const labels = useSheetLabels();
  const announce = useContext(AnnounceContext);
  return <TData extends RowData>(
    table: Table<SheetFeatures, TData>,
    column: Column<SheetFeatures, TData, unknown>,
    target: Column<SheetFeatures, TData, unknown>,
    side: MoveSide,
  ) => {
    if (!moveColumn(table, column, target, side)) return;
    announce(() => {
      const visible = table.getVisibleLeafColumns();
      return labels.moved(
        columnLabel(column),
        visible.findIndex((leaf) => leaf.id === column.id) + 1,
        visible.length,
      );
    });
  };
}

type SheetColumnMoveProps<TData extends RowData> = {
  header: Header<SheetFeatures, TData, unknown>;
  /** The nearest siblings the column can move past, from `moveTargets`. */
  targets: {
    before?: Column<SheetFeatures, TData, unknown>;
    after?: Column<SheetFeatures, TData, unknown>;
  };
};

/**
 * A header's move handle. Drag it to another header, or click it for a menu
 * that moves the column one place left or right, which keyboard, touch and
 * screen reader users rely on. The menu is a native popover, like the
 * filter's.
 */
export function SheetColumnMove<TData extends RowData>({
  header,
  targets,
}: SheetColumnMoveProps<TData>) {
  const labels = useSheetLabels();
  const dragged = useContext(DraggedColumnContext);
  const move = useMoveColumn();
  const column = header.column;
  const table = header.getContext().table;
  const id = useId();
  const anchor = `--sheet-move-${id.replace(/[^\w-]/g, '')}`;
  const handle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // The items follow the visual direction, so right to left, "Move left"
  // moves the column later in the order.
  const [rtl, setRtl] = useState(false);
  const name = labels.move(columnLabel(column));

  const items = [
    {
      label: labels.moveLeft,
      target: rtl ? targets.after : targets.before,
      side: rtl ? 'after' : 'before',
    },
    {
      label: labels.moveRight,
      target: rtl ? targets.before : targets.after,
      side: rtl ? 'before' : 'after',
    },
  ] as const;
  const first = items.find((item) => item.target);

  return (
    <>
      <button
        ref={handle}
        type="button"
        draggable
        popoverTarget={id}
        aria-label={name}
        style={{ anchorName: anchor }}
        onDragStart={(event) => {
          // Widening a column slides this grip under the point where its
          // resize began, and Chrome and Safari then start dragging the grip,
          // which stops the resize. No column moves while one is resized.
          if (table.atoms.columnResizing.get().isResizingColumn) {
            event.preventDefault();
            return;
          }
          dragged.current = column.id;
          if (open) panel.current?.hidePopover();
          event.dataTransfer.effectAllowed = 'move';
          // Firefox starts a drag only once some data is set.
          event.dataTransfer.setData('text/plain', columnLabel(column));
          const cell = event.currentTarget.closest('[role="columnheader"]');
          if (cell) event.dataTransfer.setDragImage(cell, 0, 0);
        }}
        onDragEnd={() => {
          dragged.current = null;
        }}
        className={cx(
          'inline-flex size-6 cursor-grab items-center justify-center text-sheet-fg/30 hover:text-sheet-fg dark:text-sheet-fg-dark/30 dark:hover:text-sheet-fg-dark',
          open
            ? 'opacity-100'
            : 'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
        )}
      >
        <GripVertical className="size-3" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={name}
        onToggle={(event) => {
          const opened = event.newState === 'open';
          if (opened && handle.current)
            setRtl(getComputedStyle(handle.current).direction === 'rtl');
          setOpen(opened);
        }}
        onKeyDown={(event) => {
          // Closed here and marked handled, as the filter does.
          if (event.key !== 'Escape') return;
          event.preventDefault();
          panel.current?.hidePopover();
        }}
        style={{
          positionAnchor: anchor,
          positionArea: 'block-end span-inline-start',
          positionTryFallbacks: 'flip-inline',
        }}
        className="inset-auto m-0 mt-1 rounded-md border border-sheet-fg/10 bg-sheet-raised p-1 text-sm font-normal text-sheet-fg shadow-lg dark:border-sheet-fg-dark/10 dark:bg-sheet-raised-dark dark:text-sheet-fg-dark"
      >
        {open &&
          items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={!item.target}
              autoFocus={item === first}
              onClick={() => {
                if (!item.target) return;
                // Closed first, so React hears the popover close before the
                // move re-renders the header.
                panel.current?.hidePopover();
                move(table, column, item.target, item.side);
                handle.current?.focus({ preventScroll: true });
              }}
              className="block w-full rounded px-2 py-1 text-start whitespace-nowrap hover:bg-sheet-fg/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-sheet-fg-dark/5"
            >
              {item.label}
            </button>
          ))}
      </div>
    </>
  );
}
