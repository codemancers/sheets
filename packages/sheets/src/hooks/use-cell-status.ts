import { useCallback, useEffect, useRef, useState } from 'react';

/** Keyed by row + column so two cells in the same row are independent. */
export function cellStatusKey(rowId: string, columnId: string) {
  return `${rowId}::${columnId}`;
}

/**
 * `dirty` and `saving` only occur when writes are staged rather than sent per
 * edit (see `useRowChanges`). With the immediate flush policy a cell goes
 * straight from nothing to `saved` or `error`, as it always did.
 */
export type CellStatus =
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

export type CellStatusMap = Record<string, CellStatus>;
export type RejectedCellValueMap = Record<string, string>;

/** `{ field: [messages] }`, as returned by an API that attributes its errors. */
export type CellFieldErrors = Record<string, string[]>;

const SAVED_TIMEOUT_MS = 2000;

/**
 * Outcome of a field edit, reported on the cell that changed rather than in a
 * toast — a toast cannot say *which* cell it is about.
 *
 * Tracks two things with deliberately different lifetimes:
 *
 * - **status** — the tick or the error icon. A tick clears itself; there is
 *   nothing to act on. An error persists, because it describes a condition that
 *   is still true (the value was not saved), so expiring it would only remove
 *   the evidence and leave an unchanged cell looking like a success.
 * - **rejected value** — what the user typed that was refused. Kept so the cell
 *   can keep showing it: an icon explaining a failure whose cause has been
 *   reverted off screen is useless. It outlives the icon on purpose, so
 *   reopening an editor can start from the rejected text and a typo can be
 *   fixed rather than retyped.
 *
 * Lives outside `useSheet`: handlers that report outcomes are defined before the
 * `columns` an instance is built from, so a setter hanging off the instance
 * would be referenced before it exists.
 */
export function useCellStatus() {
  const [statuses, setStatuses] = useState<CellStatusMap>({});
  const [rejectedValues, setRejectedValues] = useState<RejectedCellValueMap>(
    {},
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Timers outlive the row they belong to — a sorted or refetched list can
  // unmount it — so drop them all on unmount rather than leaking setState.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const clearTimer = useCallback((key: string) => {
    const timer = timers.current.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(key);
    }
  }, []);

  const dropStatus = useCallback((key: string) => {
    setStatuses((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const dropRejectedValue = useCallback((key: string) => {
    setRejectedValues((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const setStatus = useCallback(
    (key: string, status: CellStatus, timeoutMs: number | null) => {
      // Re-reporting the same cell restarts any countdown, rather than letting
      // the previous timer cut the new status short.
      clearTimer(key);
      setStatuses((current) => ({ ...current, [key]: status }));
      if (timeoutMs !== null) {
        timers.current.set(
          key,
          setTimeout(() => {
            timers.current.delete(key);
            dropStatus(key);
          }, timeoutMs),
        );
      }
    },
    [clearTimer, dropStatus],
  );

  /** Clears the icon and leaves any rejected value in place. */
  const clearCellStatus = useCallback(
    (rowId: string, columnId: string) => {
      const key = cellStatusKey(rowId, columnId);
      clearTimer(key);
      dropStatus(key);
    },
    [clearTimer, dropStatus],
  );

  const forgetRejectedCellValue = useCallback(
    (rowId: string, columnId: string) =>
      dropRejectedValue(cellStatusKey(rowId, columnId)),
    [dropRejectedValue],
  );

  /** Escape, or anything else that gives up on the edit: drops icon and value. */
  const abandonCellValueChange = useCallback(
    (rowId: string, columnId: string) => {
      clearCellStatus(rowId, columnId);
      forgetRejectedCellValue(rowId, columnId);
    },
    [clearCellStatus, forgetRejectedCellValue],
  );

  /**
   * Staged locally and not yet sent. Persists: the edit is real and unsaved, so
   * an expiring indicator would imply it had landed.
   */
  const setCellDirty = useCallback(
    (rowId: string, columnId: string) =>
      setStatus(cellStatusKey(rowId, columnId), { kind: 'dirty' }, null),
    [setStatus],
  );

  /** In flight. Also persists — it is superseded by the outcome, not by time. */
  const setCellSaving = useCallback(
    (rowId: string, columnId: string) =>
      setStatus(cellStatusKey(rowId, columnId), { kind: 'saving' }, null),
    [setStatus],
  );

  /** A save supersedes any rejection, so the retained value goes with it. */
  const setCellSaved = useCallback(
    (
      rowId: string,
      columnId: string,
      timeoutMs: number | null = SAVED_TIMEOUT_MS,
    ) => {
      forgetRejectedCellValue(rowId, columnId);
      setStatus(cellStatusKey(rowId, columnId), { kind: 'saved' }, timeoutMs);
    },
    [forgetRejectedCellValue, setStatus],
  );

  /**
   * Errors never expire: the condition they describe is still true, so a
   * countdown would only remove the evidence that the write failed.
   */
  const setCellError = useCallback(
    (rowId: string, columnId: string, message: string) =>
      setStatus(
        cellStatusKey(rowId, columnId),
        { kind: 'error', message },
        null,
      ),
    [setStatus],
  );

  /**
   * The usual way to report a refused edit: shows the icon *and* keeps the value
   * that was refused, so the cell can go on displaying it.
   */
  const rejectCellValue = useCallback(
    (rowId: string, columnId: string, message: string, value?: string) => {
      const key = cellStatusKey(rowId, columnId);
      if (value !== undefined) {
        setRejectedValues((current) => ({ ...current, [key]: value }));
      }
      setCellError(rowId, columnId, message);
    },
    [setCellError],
  );

  /**
   * Maps an API's field-keyed errors onto cells in one call, so a caller does
   * not unpack them by hand.
   *
   * `fieldToColumn` is for the cases where a payload field and a column id
   * differ; `values` supplies what was attempted per field, when it should stay
   * on screen. Fields with no matching column are returned as `unmapped` rather
   * than silently dropped — the caller still owes the user those messages.
   */
  const rejectFieldErrors = useCallback(
    (
      rowId: string,
      fieldErrors: CellFieldErrors,
      opts?: {
        values?: Record<string, string>;
        fieldToColumn?: Record<string, string>;
        columnIds?: string[];
      },
    ) => {
      const unmapped: Record<string, string[]> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const message = messages[0];
        if (!message) continue;
        const columnId = opts?.fieldToColumn?.[field] ?? field;
        if (opts?.columnIds && !opts.columnIds.includes(columnId)) {
          unmapped[field] = messages;
          continue;
        }
        rejectCellValue(rowId, columnId, message, opts?.values?.[field]);
      }
      return { unmapped };
    },
    [rejectCellValue],
  );

  const rejectedCellValue = useCallback(
    (rowId: string, columnId: string) =>
      rejectedValues[cellStatusKey(rowId, columnId)],
    [rejectedValues],
  );

  return {
    statuses,
    rejectedCellValue,
    rejectCellValue,
    rejectFieldErrors,
    abandonCellValueChange,
    clearCellStatus,
    setCellDirty,
    setCellSaving,
    setCellSaved,
  };
}

export type CellStatusState = ReturnType<typeof useCellStatus>;
