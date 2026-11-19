'use client';

import { cx } from '../cx.js';
import { editOnKey } from './edit-key.js';
import { ArrowUpRight, PanelRight } from '../icons.js';
import { useSheetLabels } from '../labels.js';
import type { MouseEvent, ReactNode } from 'react';
import { useInlineEdit } from '../../hooks/use-inline-edit.js';
import type {
  CellCommitResult,
  SheetCellValidator,
} from '../../hooks/types.js';
import { useSheetCellEditing } from '../../hooks/use-cell-editing.js';

type LinkLikeProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
  title?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Opt into spreadsheet-style renaming: a plain click on the name starts an
 * in-place edit instead of opening the row. Both destinations stay one click
 * away on the hover icons, which is why the name's click is free to reassign.
 */
export type SheetPrimaryCellEditable = {
  /** The raw text to edit. `children` may be decorated; this may not. */
  value: string;
  /**
   * Called with the new text. Skipped when the value came back unchanged.
   * Return `{ error }`, or throw, and the failure is shown on this cell with
   * the typed text kept, to be fixed and retried.
   *
   * Not used when the Sheet stages writes (`useRowChanges`): the value is handed
   * to the row's buffer and the row's `onSubmitRow` performs the write, so a
   * per-cell request would duplicate it. Optional for that reason.
   */
  onCommit?: (next: string) => CellCommitResult | Promise<CellCommitResult>;
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
   * Extra work when the edit ends with nothing to save: Escape, or Enter or
   * blur with the text unchanged. Inside a Sheet the retained value and the
   * status are both dropped for you, so the cell cannot be left showing
   * something that was never saved.
   */
  onCancel?: () => void;
};

export type SheetPrimaryCellProps = {
  /**
   * Where the name links — often the URL that opens this row in place (e.g.
   * `/<resource>?id=<rowId>`), so modified-click / "open in new tab" lands
   * there. Omit for a name that is not a link. Unused when `editable` is set: the name is then a button, and
   * `detailHref`'s icon is the cmd-clickable link.
   */
  href?: string;
  /**
   * The row's own page (`/<resource>/<rowId>`). Omit when there is none: the
   * detail icon is not rendered.
   */
  detailHref?: string;
  /**
   * Opens the row in place — a side panel, a dialog, whatever the app uses.
   * Fired by a plain click on the name and by the panel icon. Omit to have the
   * name navigate normally, without the panel icon.
   */
  onOpen?: () => void;
  /** Accessible label for the open icon. */
  openLabel?: string;
  /** Accessible label for the detail-page icon. */
  detailLabel?: string;
  children?: ReactNode;
  className?: string;
  /**
   * Your router's link, e.g. Next.js `Link`. To stop Next from prefetching
   * every row's URL, wrap it: `(props) => <Link prefetch={false} {...props} />`.
   */
  LinkComponent?: React.ComponentType<LinkLikeProps>;
  /** Omit for a read-only name cell (the default). */
  editable?: SheetPrimaryCellEditable;
};

function DefaultLink({ children, ...props }: LinkLikeProps) {
  return <a {...props}>{children}</a>;
}

const nameLinkClass =
  'block min-w-0 truncate px-2 py-1.5 text-sm text-sheet-link hover:text-sheet-link-hover dark:text-sheet-link-dark dark:hover:text-sheet-link-hover-dark';

const iconActionClass =
  'rounded p-1 text-sheet-muted hover:bg-sheet-fg/5 hover:text-sheet-fg dark:text-sheet-muted-dark dark:hover:bg-sheet-fg-dark/5 dark:hover:text-sheet-fg-dark';

/**
 * Primary (name) cell for Sheet rows: the row's name — a link, a button that
 * opens the row, or plain text — plus up to two hover-revealed row actions:
 * open the row in place, or go to its own page. SheetRow renders `role="row"`, so the actions
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
  onOpen,
  openLabel = 'Open',
  detailLabel = 'Open details page',
  children,
  className,
  LinkComponent = DefaultLink,
  editable,
}: SheetPrimaryCellProps) {
  const cell = useSheetCellEditing(editable?.schema);
  const labels = useSheetLabels();
  const pending = cell.submittingValue ?? cell.stagedValue ?? cell.refusedValue;
  const value =
    pending === undefined ? (editable?.value ?? '') : String(pending);

  // Nothing to save: drop whatever this cell was holding on to, and tell the
  // app.
  const end = () => {
    cell.abandon();
    editable?.onCancel?.();
  };

  const commit = async (next: string) => {
    if (!editable) return;
    // Back to the saved value: nothing to send, and any refused or staged
    // value goes.
    if (next === editable.value) {
      end();
      return;
    }
    const verdict = cell.accepts(next);
    if (!(typeof verdict === 'boolean' ? verdict : await verdict)) return;
    // Staged when the Sheet owns submission, so several fields can go in one
    // write; otherwise the cell's own handler performs it.
    if (cell.canStage) {
      await cell.stage(next);
      return;
    }
    await cell.submit(editable.onCommit, next, labels.saveFailed);
  };

  const { isEditing, beginEdit, triggerRef, inputProps } =
    useInlineEdit<string>({
      value,
      dirty: pending !== undefined,
      onCommit: commit,
      onCancel: end,
    });

  // A click, F2 or a typed key on the editable name.
  const start = (draft?: string) => {
    cell.clearOnEditStart();
    editable?.onEditStart?.();
    beginEdit(draft);
  };

  if (editable && isEditing) {
    return (
      <input
        type="text"
        placeholder={editable.placeholder}
        aria-label={cell.label}
        {...inputProps}
        className={cx(
          'w-full border-0 bg-transparent px-2 py-1.5 text-sm text-sheet-fg outline-none focus:outline-none dark:text-sheet-fg-dark',
          className,
        )}
      />
    );
  }

  return (
    <div className={cx('flex w-full items-center gap-1 pe-1', className)}>
      {editable ? (
        // Plain text, not link-blue: the click edits rather than navigates, and
        // blue would promise navigation. `cursor-text` is the tell, same as
        // SheetEditableTextCell. It fills the cell up to the icons, so the
        // focus ring that returns after Enter or Escape outlines the cell.
        <button
          ref={triggerRef}
          type="button"
          onClick={() => start()}
          onKeyDown={(event) => editOnKey(event, start)}
          className="block min-w-0 flex-1 cursor-text truncate px-2 py-1.5 text-start text-sm text-sheet-fg dark:text-sheet-fg-dark"
        >
          {/* An empty value means a refused edit is still on screen, so show the
              placeholder rather than a blank cell that reads as broken. When a
              refused value is showing it wins over `children`, which would
              otherwise render the stored value the cell no longer reflects. */}
          {value === '' && editable.placeholder ? (
            <span className="text-sheet-faint dark:text-sheet-faint-dark">
              {editable.placeholder}
            </span>
          ) : pending !== undefined ? (
            value
          ) : (
            children
          )}
        </button>
      ) : href ? (
        <LinkComponent
          href={href}
          onClick={
            onOpen
              ? (e) => {
                  // Plain left-click: open the row in place. Modified clicks
                  // (cmd/ctrl/shift, middle button) fall through, so "Open in
                  // new tab" lands on href.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
                    return;
                  e.preventDefault();
                  onOpen();
                }
              : undefined
          }
          className={nameLinkClass}
        >
          {children}
        </LinkComponent>
      ) : onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={cx(nameLinkClass, 'text-start')}
        >
          {children}
        </button>
      ) : (
        <span className="block min-w-0 truncate px-2 py-1.5 text-sm text-sheet-fg dark:text-sheet-fg-dark">
          {children}
        </span>
      )}
      {(onOpen || detailHref != null) && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 [[role=row]:hover_&]:opacity-100">
          {onOpen && (
            <button
              type="button"
              aria-label={openLabel}
              title={openLabel}
              onClick={onOpen}
              className={iconActionClass}
            >
              <PanelRight className="size-4" />
            </button>
          )}
          {detailHref != null && (
            <LinkComponent
              href={detailHref}
              aria-label={detailLabel}
              title={detailLabel}
              className={iconActionClass}
            >
              <ArrowUpRight className="size-4" />
            </LinkComponent>
          )}
        </div>
      )}
    </div>
  );
}
