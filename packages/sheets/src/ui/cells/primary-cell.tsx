import { cx } from '../cx.js';
import { ArrowUpRight, PanelRight } from '../icons.js';
import type { MouseEvent, ReactNode } from 'react';
import { useInlineEdit } from '../../hooks/use-inline-edit.js';
import type { SheetCellValidator } from '../../hooks/types.js';
import { useSheetCellEditing } from '../../hooks/use-cell-editing.js';

type LinkLikeProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
  title?: string;
  prefetch?: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Opt into spreadsheet-style renaming: a plain click on the name starts an
 * in-place edit instead of opening the drawer. Both destinations stay one click
 * away on the hover icons, which is why the name's click is free to reassign —
 * it was always redundant with the panel icon.
 */
export type SheetPrimaryCellEditable = {
  /** The raw text to edit. `children` may be decorated; this may not. */
  value: string;
  /**
   * Called with the new text. Skipped when the value came back unchanged.
   *
   * Not used when the Sheet stages writes (`useRowChanges`): the value is handed
   * to the row's buffer and the row's `onSubmitRow` performs the write, so a
   * per-cell request would duplicate it. Optional for that reason.
   */
  onCommit?: (next: string) => void | Promise<void>;
  placeholder?: string;
  /**
   * Checked before `onCommit`; a failure is reported on this cell instead, so
   * the rule lives with the column and no consumer hand-rolls a validation call.
   *
   * Only applied inside a `Sheet`, which is what supplies somewhere to report to.
   * Rendered standalone, the value passes straight through to `onCommit` — better
   * than blocking the commit with nothing on screen to explain why.
   */
  schema?: SheetCellValidator;
  /**
   * Extra work when the user opens the editor. Inside a Sheet the standing error
   * on this cell is cleared for you first — they are acting on it, and the status
   * icon sits over this cell's right edge where it would cover the text being
   * typed. Any retained value is kept, so a typo is fixed rather than retyped.
   */
  onEditStart?: () => void;
  /**
   * Extra work on Escape. Inside a Sheet the retained value and the status are
   * both dropped for you, so the cell cannot be left showing something that was
   * never saved.
   */
  onCancel?: () => void;
};

export type SheetPrimaryCellProps = {
  /**
   * Drawer URL (`/<resource>?id=<rowId>`) — where modified-click / "open in new
   * tab" lands. Unused when `editable` is set: the name is then a button, and
   * `detailHref`'s icon is the cmd-clickable link.
   */
  href: string;
  /**
   * Full detail page URL (`/<resource>/<rowId>`). Omit for drawer-only
   * entities (no full-page route) — the detail icon is not rendered.
   */
  detailHref?: string;
  /** Opens the detail drawer — fired by plain click on the name and by the panel icon. */
  onOpenDrawer: () => void;
  /** Accessible label for the drawer icon. */
  drawerLabel?: string;
  /** Accessible label for the detail-page icon. */
  detailLabel?: string;
  children?: ReactNode;
  className?: string;
  LinkComponent?: React.ComponentType<LinkLikeProps>;
  /** Omit for a read-only name cell (the default). */
  editable?: SheetPrimaryCellEditable;
};

function DefaultLink({ prefetch: _prefetch, ...props }: LinkLikeProps) {
  return <a {...props} />;
}

const iconActionClass =
  'rounded p-1 text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white';

/**
 * Primary (name) cell for Sheet rows: a drawer-opening link plus two
 * hover-revealed row actions — open the detail drawer, or jump to the
 * full detail page. SheetRow renders `role="row"`, so the actions
 * reveal via an ancestor-hover arbitrary variant without the row
 * needing a `group` class; `focus-within` keeps them reachable by
 * keyboard.
 *
 * Pass `editable` to make the name itself rename in place on click, Sheets
 * style. The name becomes a button rather than a link: a link whose click edits
 * would lie to screen readers, and both destinations remain on the icons.
 */
export function SheetPrimaryCell({
  href,
  detailHref,
  onOpenDrawer,
  drawerLabel = 'Open in side drawer',
  detailLabel = 'Open details page',
  children,
  className,
  LinkComponent = DefaultLink,
  editable,
}: SheetPrimaryCellProps) {
  const cell = useSheetCellEditing(editable?.schema);
  const refused = cell.refusedValue;
  const value = cell.stagedValue ?? refused ?? editable?.value ?? '';

  const commit = async (next: string) => {
    if (!editable) return;
    if (!cell.accepts(next)) return;
    // Staged when the Sheet owns submission, so several fields can go in one
    // write; otherwise the cell's own handler performs it.
    if (cell.canStage) {
      await cell.stage(next);
      return;
    }
    await editable.onCommit?.(next);
  };

  const { isEditing, beginEdit, inputProps } = useInlineEdit<string>({
    value,
    onCommit: commit,
    onCancel: () => {
      cell.abandon();
      editable?.onCancel?.();
    },
  });

  if (editable && isEditing) {
    return (
      <input
        type="text"
        placeholder={editable.placeholder}
        {...inputProps}
        // Overrides inputProps: useInlineEdit's autoFocus also decides whether
        // the cell *starts* in edit mode, which must stay false here. This input
        // only exists once the user has opened it, so focusing it is always
        // right — without this, clicking the name needs a second click to type.
        autoFocus
        className={cx(
          'w-full border-0 bg-transparent px-2 py-1.5 text-sm text-zinc-950 outline-none focus:outline-none dark:text-white',
          className,
        )}
      />
    );
  }

  return (
    <div className={cx('flex w-full items-center gap-1 pr-1', className)}>
      {editable ? (
        // Plain text, not link-blue: the click edits rather than navigates, and
        // blue would promise navigation. `cursor-text` is the tell, same as
        // SheetEditableTextCell.
        <button
          type="button"
          onClick={() => {
            cell.clearOnEditStart();
            editable.onEditStart?.();
            beginEdit();
          }}
          className="block min-w-0 cursor-text truncate px-2 py-1.5 text-left text-sm text-zinc-950 dark:text-white"
        >
          {/* An empty value means a refused edit is still on screen, so show the
              placeholder rather than a blank cell that reads as broken. When a
              refused value is showing it wins over `children`, which would
              otherwise render the stored value the cell no longer reflects. */}
          {value === '' && editable.placeholder ? (
            <span className="text-zinc-400 dark:text-zinc-500">
              {editable.placeholder}
            </span>
          ) : (cell.stagedValue ?? refused) !== undefined ? (
            (cell.stagedValue ?? refused)
          ) : (
            children
          )}
        </button>
      ) : (
        <LinkComponent
          href={href}
          prefetch={false}
          onClick={(e) => {
            // Plain left-click: open drawer in place. Modified clicks
            // (cmd/ctrl/shift, middle button) fall through so "Open in
            // new tab" lands on the drawer URL and auto-opens on mount.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            onOpenDrawer();
          }}
          className="block min-w-0 truncate px-2 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {children}
        </LinkComponent>
      )}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 [[role=row]:hover_&]:opacity-100">
        <button
          type="button"
          aria-label={drawerLabel}
          title={drawerLabel}
          onClick={onOpenDrawer}
          className={iconActionClass}
        >
          <PanelRight className="size-4" />
        </button>
        {detailHref != null && (
          <LinkComponent
            href={detailHref}
            prefetch={false}
            aria-label={detailLabel}
            title={detailLabel}
            className={iconActionClass}
          >
            <ArrowUpRight className="size-4" />
          </LinkComponent>
        )}
      </div>
    </div>
  );
}
