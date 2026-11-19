'use client';

import { cx } from '../cx.js';
import { editOnKey } from './edit-key.js';
import { useSheetLabels } from '../labels.js';
import { useInlineEdit } from '../../hooks/use-inline-edit.js';
import type {
  CellCommitResult,
  SheetCellValidator,
} from '../../hooks/types.js';
import { useSheetCellEditing } from '../../hooks/use-cell-editing.js';

export type SheetEditableTextCellProps = {
  value: string;
  /**
   * Saves the new value. Return `{ error }`, or throw, and the failure is
   * shown on this cell with the typed value kept, to be fixed and retried.
   */
  onCommit?: (next: string) => CellCommitResult | Promise<CellCommitResult>;
  /**
   * The edit ended with nothing to save: Escape, or Enter or blur with the
   * value unchanged. A new row uses it to remove itself.
   */
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /**
   * Checked before `onCommit`; a failure is reported on this cell and the commit
   * is skipped, so the rule lives with the column rather than in a hand-rolled
   * call at each call site.
   *
   * Only applied inside a `Sheet`, which is what supplies somewhere to report to.
   * Rendered standalone the value passes straight through — blocking a commit
   * with nothing on screen to explain why is worse than not checking.
   */
  schema?: SheetCellValidator;
  /**
   * Hand committed values to the Sheet's row buffer (`useRowChanges`) instead
   * of `onCommit`, the way `SheetPrimaryCell` does, so they join the row's
   * write. Off by default: a commit can mean *create* (an unsaved new row), and
   * staging that would patch a row that does not exist yet.
   */
  stage?: boolean;
};

/**
 * Generic click-to-edit text cell. Commits go to `onCommit`, or to the
 * Sheet's row buffer with `stage`.
 */
export function SheetEditableTextCell({
  value,
  onCommit,
  onCancel,
  placeholder,
  className,
  autoFocus = false,
  schema,
  stage = false,
}: SheetEditableTextCellProps) {
  const cell = useSheetCellEditing(schema);
  const labels = useSheetLabels();
  const staging = stage && cell.canStage;
  const pending =
    cell.submittingValue ??
    (staging ? cell.stagedValue : undefined) ??
    cell.refusedValue;
  const displayValue = pending === undefined ? (value ?? '') : String(pending);

  // Nothing to save: drop whatever this cell was holding on to, and tell the
  // app, so a new row can remove itself.
  const end = () => {
    cell.abandon();
    onCancel?.();
  };

  const commit = async (next: string) => {
    // Back to the saved value: nothing to send, and any refused value goes.
    if (next === value) {
      end();
      return;
    }
    const verdict = cell.accepts(next);
    if (!(typeof verdict === 'boolean' ? verdict : await verdict)) return;
    if (staging) {
      await cell.stage(next);
      return;
    }
    await cell.submit(onCommit, next, labels.saveFailed);
  };

  const { isEditing, beginEdit, triggerRef, inputProps } =
    useInlineEdit<string>({
      value: displayValue,
      dirty: pending !== undefined,
      onCommit: commit,
      onCancel: end,
      autoFocus,
    });

  // A click, F2 or a typed key. The standing error on the cell goes: the user
  // is acting on it.
  const start = (draft?: string) => {
    cell.clearOnEditStart();
    beginEdit(draft);
  };

  if (isEditing) {
    return (
      <input
        type="text"
        placeholder={placeholder}
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
    <button
      ref={triggerRef}
      type="button"
      onClick={() => start()}
      onKeyDown={(event) => editOnKey(event, start)}
      className={cx(
        'block w-full cursor-text truncate px-2 py-1.5 text-start text-sm',
        displayValue
          ? 'text-sheet-fg dark:text-sheet-fg-dark'
          : 'text-sheet-faint dark:text-sheet-faint-dark',
        className,
      )}
    >
      {displayValue || placeholder || ''}
    </button>
  );
}
