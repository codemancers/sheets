'use client';

import { cx } from '../cx.js';
import { useInlineEdit } from '../../hooks/use-inline-edit.js';
import type { SheetCellValidator } from '../../hooks/types.js';
import { useSheetCellEditing } from '../../hooks/use-cell-editing.js';

export type SheetEditableTextCellProps = {
  value: string;
  onCommit?: (next: string) => void | Promise<void>;
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
};

/**
 * Generic click-to-edit text cell.
 *
 * Unlike `SheetPrimaryCell` this never stages into a row buffer, even when the
 * Sheet has one: its commit semantics belong to the caller. ProjectList uses it
 * for the unsaved new row, where committing *creates* a project rather than
 * patching one — staging that would try to update a row that has no id.
 */
export function SheetEditableTextCell({
  value,
  onCommit,
  onCancel,
  placeholder,
  className,
  autoFocus = false,
  schema,
}: SheetEditableTextCellProps) {
  const cell = useSheetCellEditing(schema);
  const displayValue = cell.refusedValue ?? value ?? '';

  const commit = async (next: string) => {
    // Back to the saved value: nothing to send, and any refused value goes.
    if (next === value) {
      cell.abandon();
      return;
    }
    if (!cell.accepts(next)) return;
    // Deliberately not staged, even when the Sheet has a row buffer: this cell's
    // commit may mean create rather than update.
    await onCommit?.(next);
  };

  const { isEditing, beginEdit, inputProps } = useInlineEdit<string>({
    value: displayValue,
    dirty: cell.refusedValue !== undefined,
    onCommit: commit,
    onCancel: () => {
      cell.abandon();
      onCancel?.();
    },
    autoFocus,
  });

  if (isEditing) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        {...inputProps}
        className={cx(
          'w-full border-0 bg-transparent px-2 py-1.5 text-sm text-zinc-950 outline-none focus:outline-none dark:text-white',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        cell.clearOnEditStart();
        beginEdit();
      }}
      className={cx(
        'block w-full cursor-text truncate px-2 py-1.5 text-left text-sm',
        displayValue
          ? 'text-zinc-950 dark:text-white'
          : 'text-zinc-400 dark:text-zinc-500',
        className,
      )}
    >
      {displayValue || placeholder || ''}
    </button>
  );
}
