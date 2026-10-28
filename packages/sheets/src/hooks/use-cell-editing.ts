'use client';

import type { SheetCellValidator, StandardSchemaV1Result } from './types.js';
import { useSheetCellScope } from './cell-context.js';

/**
 * The behaviour every editable cell shares once it is inside a Sheet: which
 * value to display, whether a committed value is allowed, and what to do when
 * the editor opens or is abandoned.
 *
 * Extracted because both editable cells had it character-for-character
 * identical. Two copies of a validation gate is the kind of duplication that
 * drifts silently — a fix applied to one cell simply would not reach the other,
 * and the failure mode is a cell that saves values its column forbids.
 *
 * Everything degrades to a no-op outside a Sheet, where there is no scope to
 * report to. Cells rendered standalone in tests and docs therefore behave as
 * they did before any of this existed.
 */
export function useSheetCellEditing(schema?: SheetCellValidator) {
  const scope = useSheetCellScope();
  const cellStatus = scope?.cellStatus;
  const rowChanges = scope?.rowChanges;

  // A value the last commit was refused for. Kept on screen so the error icon
  // has something to explain — an icon whose cause was reverted is useless.
  const refusedValue =
    scope && cellStatus
      ? cellStatus.rejectedCellValue(scope.rowId, scope.columnId)
      : undefined;

  // Staged but not yet sent. Wins over both: it is the newest thing typed, and
  // a refetch landing mid-edit must not replace it with the server's older copy.
  const stagedValue =
    scope && rowChanges
      ? rowChanges.stagedCellValue(scope.rowId, scope.columnId)
      : undefined;

  /**
   * Runs the column's rule. Reports the failure on this cell and returns false,
   * so the caller can bail before writing or staging anything. Synchronous
   * schemas answer synchronously, so a passing value still reaches the
   * caller's `onCommit` in the same microtask; async ones return a promise.
   */
  const accepts = (next: unknown): boolean | Promise<boolean> => {
    if (!schema || !scope || !cellStatus) return true;
    const settle = (result: StandardSchemaV1Result<unknown>) => {
      if (!result.issues) return true;
      cellStatus.rejectCellValue(
        scope.rowId,
        scope.columnId,
        result.issues[0]?.message ?? 'Invalid value',
        next,
      );
      return false;
    };
    const result = schema['~standard'].validate(next);
    return result instanceof Promise ? result.then(settle) : settle(result);
  };

  /**
   * The user is acting on the cell, so the icon has done its job — and it sits
   * over the right edge, where it would cover the text being typed. The refused
   * value stays, so a typo is fixed rather than retyped.
   */
  const clearOnEditStart = () => {
    if (scope && cellStatus) {
      cellStatus.clearCellStatus(scope.rowId, scope.columnId);
    }
  };

  /** Escape: drop the icon, the refused value, and anything staged. */
  const abandon = () => {
    if (scope && rowChanges) {
      rowChanges.discardCellValue(scope.rowId, scope.columnId);
    }
    if (scope && cellStatus) {
      cellStatus.abandonCellValueChange(scope.rowId, scope.columnId);
    }
  };

  /**
   * Whether the Sheet submits per row. Exposed as a plain boolean rather than
   * being folded into `stage`, so a cell can decide without awaiting: an `await`
   * before a caller's own `onCommit` would push it past the current microtask,
   * which changes observable ordering for anything watching that call.
   */
  const canStage = scope !== undefined && rowChanges !== undefined;

  /** Hands the value to the row's buffer. Only valid when `canStage`. */
  const stage = (next: unknown) =>
    scope && rowChanges
      ? rowChanges.stageCellValue(scope.rowId, scope.columnId, next)
      : Promise.resolve();

  return {
    /** The column's header text, to name the editor for assistive tech. */
    label: scope?.columnLabel,
    refusedValue,
    stagedValue,
    accepts,
    clearOnEditStart,
    abandon,
    canStage,
    stage,
  };
}
