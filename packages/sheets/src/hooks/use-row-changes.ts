'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CellStatusState } from './use-cell-status.js';

/** Field edits staged for one row, keyed by column id. */
export type RowChanges = Record<string, unknown>;

/**
 * What a write reports back. `void` (or an object with no `error`) is success.
 *
 * Structural on purpose, like `SheetCellValidator` — ui-kit needs to know what
 * failure looks like, not where the request went.
 */
export type RowSubmitResult = void | {
  error?: string;
  /** `{ field: [messages] }` — attributed per field where the API can. */
  fieldErrors?: Record<string, string[]>;
};

export type RowFlushPolicy = 'immediate' | { debounce: number };

export type UseRowChangesOptions = {
  /**
   * Performs the write for one row with every field staged for it. Called with
   * a single-entry `changes` under the immediate policy, so adopting this does
   * not by itself change how many requests are made.
   */
  onSubmitRow: (
    rowId: string,
    changes: RowChanges,
  ) => Promise<RowSubmitResult> | RowSubmitResult;
  /** Where outcomes are reported. Same instance the Sheet renders from. */
  cellStatus: CellStatusState;
  /**
   * `"immediate"` (default) sends each edit as it is committed — one request per
   * field, which is what a Sheet did before staging existed.
   *
   * `{ debounce: ms }` waits for a gap in editing and sends everything staged
   * for that row as one write. Editing a second field inside the window joins
   * the same request rather than racing it.
   */
  flush?: RowFlushPolicy;
  /** Message for a write that never reached the server. */
  transportErrorMessage?: string;
};

const DEFAULT_TRANSPORT_ERROR = 'Could not save. Check your connection.';

/**
 * Stages field edits per row and flushes them as one write.
 *
 * The unit of submission is the row, not the cell. A cell hands its committed
 * value here instead of performing its own request, which is what makes
 * "aggregate several fields, submit once" a flush-policy choice rather than a
 * change of architecture. Under `"immediate"` the aggregate is always one field
 * and the behaviour matches per-cell writes exactly.
 *
 * Three things are deliberate:
 *
 * - **One flight per row.** A second flush for a row already in flight waits
 *   for it, rather than racing it — concurrent PATCHes to one row would land in
 *   arbitrary order and the later value could lose.
 * - **A failed batch stays dirty in full.** The API applies a row's fields in
 *   one write, so a clash on one field means none of them saved. Marking only
 *   the offending cell would leave the others looking saved when they are not.
 * - **Staged values outlive the cell.** They live here, above the table, for the
 *   same reason cell statuses do: rows remount, and an unsaved edit must not
 *   disappear with them.
 */
export function useRowChanges({
  onSubmitRow,
  cellStatus,
  flush = 'immediate',
  transportErrorMessage = DEFAULT_TRANSPORT_ERROR,
}: UseRowChangesOptions) {
  const [staged, setStaged] = useState<Record<string, RowChanges>>({});

  // Mirrors `staged` for the flush path, which runs from a timer or a promise
  // chain and would otherwise read the state it closed over rather than the
  // latest — a second edit inside the debounce window would be dropped.
  const stagedRef = useRef<Record<string, RowChanges>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(new Map<string, Promise<void>>());
  // Read through refs so a flush scheduled earlier still calls the current
  // handler, without every staged edit rescheduling itself.
  const submitRef = useRef(onSubmitRow);
  submitRef.current = onSubmitRow;
  const statusRef = useRef(cellStatus);
  statusRef.current = cellStatus;
  const messageRef = useRef(transportErrorMessage);
  messageRef.current = transportErrorMessage;

  useEffect(() => {
    const pending = timers.current;
    return () => {
      // Fire whatever is queued rather than silently dropping it. This cannot be
      // awaited from a cleanup, so a flush still in flight when the tree goes
      // away is not observable — see the README on navigation.
      pending.forEach((timer, rowId) => {
        clearTimeout(timer);
        void flushRowRef.current?.(rowId);
      });
      pending.clear();
    };
  }, []);

  const writeStaged = useCallback(
    (rowId: string, next: RowChanges | undefined) => {
      if (next === undefined) {
        delete stagedRef.current[rowId];
        setStaged((current) => {
          if (!(rowId in current)) return current;
          const copy = { ...current };
          delete copy[rowId];
          return copy;
        });
        return;
      }
      stagedRef.current = { ...stagedRef.current, [rowId]: next };
      setStaged((current) => ({ ...current, [rowId]: next }));
    },
    [],
  );

  const flushRow = useCallback(
    async (rowId: string): Promise<void> => {
      const timer = timers.current.get(rowId);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.current.delete(rowId);
      }

      // Wait out any flight, then re-read: anything staged meanwhile is
      // included in this pass instead of overtaking the request ahead of it.
      // Loop, because another flush queued behind the same flight may have
      // started the next one first.
      let running = inFlight.current.get(rowId);
      while (running) {
        await running;
        running = inFlight.current.get(rowId);
      }

      const changes = stagedRef.current[rowId];
      if (!changes || Object.keys(changes).length === 0) return;

      const columnIds = Object.keys(changes);
      const status = statusRef.current;
      columnIds.forEach((columnId) => status.setCellSaving(rowId, columnId));

      const flight = (async () => {
        try {
          const result = await submitRef.current(rowId, changes);

          if (result && result.error) {
            const fieldErrors = result.fieldErrors ?? {};
            const { unmapped } = status.rejectFieldErrors(rowId, fieldErrors, {
              values: changes,
              columnIds,
            });
            // The sent fields with a message of their own. A field listed with
            // no messages says nothing about what is wrong with it.
            const attributed = columnIds.filter(
              (columnId) => fieldErrors[columnId]?.[0],
            );

            // Nothing attributable, or attributed somewhere with no column: the
            // message still has to land, so it goes on the fields we sent.
            if (attributed.length === 0 || Object.keys(unmapped).length > 0) {
              columnIds.forEach((columnId) =>
                status.rejectCellValue(
                  rowId,
                  columnId,
                  result.error as string,
                  changes[columnId],
                ),
              );
            } else {
              // Attributed to a subset, but the whole write was refused, so the
              // rest are unsaved too — dirty, without claiming a reason.
              columnIds
                .filter((columnId) => !attributed.includes(columnId))
                .forEach((columnId) => status.setCellDirty(rowId, columnId));
            }
            return;
          }

          // Only clear what this pass sent; an edit staged mid-flight stays.
          const latest = stagedRef.current[rowId] ?? {};
          const remaining = Object.fromEntries(
            Object.entries(latest).filter(([columnId]) => {
              const sent = columnIds.includes(columnId);
              return !sent || latest[columnId] !== changes[columnId];
            }),
          );
          writeStaged(
            rowId,
            Object.keys(remaining).length > 0 ? remaining : undefined,
          );
          columnIds
            .filter((columnId) => !(columnId in remaining))
            .forEach((columnId) => status.setCellSaved(rowId, columnId));
        } catch {
          columnIds.forEach((columnId) =>
            status.rejectCellValue(
              rowId,
              columnId,
              messageRef.current,
              changes[columnId],
            ),
          );
        } finally {
          inFlight.current.delete(rowId);
        }
      })();

      inFlight.current.set(rowId, flight);
      return flight;
    },
    [writeStaged],
  );

  // The unmount cleanup runs before `flushRow` would be in scope for it.
  const flushRowRef = useRef<((rowId: string) => Promise<void>) | undefined>(
    undefined,
  );
  flushRowRef.current = flushRow;

  /**
   * Records a committed value and schedules the write per the flush policy.
   * Returns the flush promise under `"immediate"` so a caller can await the
   * outcome; under a debounce it resolves once staged, since the write is later
   * by design.
   */
  // A number, so an inline `{ debounce }` object doesn't change identity on
  // every render.
  const debounceMs = flush === 'immediate' ? null : flush.debounce;

  const stageCellValue = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      writeStaged(rowId, {
        ...(stagedRef.current[rowId] ?? {}),
        [columnId]: value,
      });

      if (debounceMs === null) {
        return flushRow(rowId);
      }

      statusRef.current.setCellDirty(rowId, columnId);
      const existing = timers.current.get(rowId);
      if (existing !== undefined) clearTimeout(existing);
      timers.current.set(
        rowId,
        setTimeout(() => {
          timers.current.delete(rowId);
          void flushRow(rowId);
        }, debounceMs),
      );
      return Promise.resolve();
    },
    [debounceMs, flushRow, writeStaged],
  );

  /** Drops staged edits for a cell — the row keeps anything else queued. */
  const discardCellValue = useCallback(
    (rowId: string, columnId: string) => {
      const current = stagedRef.current[rowId];
      if (!current || !(columnId in current)) return;
      const next = { ...current };
      delete next[columnId];
      writeStaged(rowId, Object.keys(next).length > 0 ? next : undefined);
      statusRef.current.clearCellStatus(rowId, columnId);
    },
    [writeStaged],
  );

  const stagedCellValue = useCallback(
    (rowId: string, columnId: string) => staged[rowId]?.[columnId],
    [staged],
  );

  const hasStagedChanges = useCallback(
    (rowId?: string) =>
      rowId === undefined
        ? Object.keys(staged).length > 0
        : Object.keys(staged[rowId] ?? {}).length > 0,
    [staged],
  );

  /** Sends everything queued now — for an explicit Save, or before navigating. */
  const flushAll = useCallback(
    () => Promise.all(Object.keys(stagedRef.current).map(flushRow)).then(),
    [flushRow],
  );

  // Stable while nothing changes, so a Sheet can skip re-rendering its rows.
  return useMemo(
    () => ({
      stagedCellValue,
      hasStagedChanges,
      stageCellValue,
      discardCellValue,
      flushAll,
    }),
    [
      stagedCellValue,
      hasStagedChanges,
      stageCellValue,
      discardCellValue,
      flushAll,
    ],
  );
}

export type RowChangesState = ReturnType<typeof useRowChanges>;
