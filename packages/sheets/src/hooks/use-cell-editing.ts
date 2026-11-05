'use client';

import { useState } from 'react';
import type {
  CellCommitResult,
  SheetCellValidator,
  StandardSchemaV1Result,
} from './types.js';
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

  // A value handed to an async onCommit, shown until the write settles, so
  // the cell doesn't flash back to the old value, or to a new row's
  // placeholder, while the request runs.
  const [submittingValue, setSubmittingValue] = useState<unknown>();

  /**
   * Hands the value to the app's `onCommit`, and reports a failure on this
   * cell: the `error` it returns, or `failedMessage` if it throws. Either way
   * the value stays on screen as a refused value, to be fixed and retried.
   * With no Sheet to report to, a thrown error is passed on. Like `accepts`,
   * a synchronous handler gets a synchronous answer.
   */
  const submit = <T>(
    onCommit:
      ((next: T) => CellCommitResult | Promise<CellCommitResult>) | undefined,
    next: T,
    failedMessage: string,
  ): void | Promise<void> => {
    if (!onCommit) return;
    const report = (result: CellCommitResult) => {
      if (result && result.error && scope && cellStatus) {
        cellStatus.rejectCellValue(
          scope.rowId,
          scope.columnId,
          result.error,
          next,
        );
      }
    };
    const fail = (error: unknown) => {
      if (!scope || !cellStatus) throw error;
      report({ error: failedMessage });
    };

    let outcome: CellCommitResult | Promise<CellCommitResult>;
    try {
      outcome = onCommit(next);
    } catch (error) {
      fail(error);
      return;
    }
    if (!(outcome instanceof Promise)) {
      report(outcome);
      return;
    }
    // Reported before the value is released, so the cell never shows the old
    // value in between.
    setSubmittingValue(next);
    return outcome
      .then(report, fail)
      .finally(() => setSubmittingValue(undefined));
  };

  return {
    /** The column's header text, to name the editor for assistive tech. */
    label: scope?.columnLabel,
    refusedValue,
    stagedValue,
    /** The value being saved through `submit`, until the save settles. */
    submittingValue,
    accepts,
    clearOnEditStart,
    abandon,
    canStage,
    stage,
    submit,
  };
}
