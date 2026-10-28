import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { cellStatusKey, useCellStatus } from './use-cell-status.js';
import {
  useRowChanges,
  type RowFlushPolicy,
  type RowSubmitResult,
} from './use-row-changes.js';

const NAME = cellStatusKey('7', 'name');
const DESC = cellStatusKey('7', 'description');

/** The two hooks compose in the consumer, so tests drive them together. */
function setup(
  onSubmitRow: (
    rowId: string,
    changes: Record<string, string>,
  ) => Promise<RowSubmitResult> | RowSubmitResult,
  flush: RowFlushPolicy = 'immediate',
) {
  return renderHook(() => {
    const cellStatus = useCellStatus();
    const rowChanges = useRowChanges({ cellStatus, onSubmitRow, flush });
    return { cellStatus, rowChanges };
  });
}

describe('useRowChanges', () => {
  describe('immediate flush', () => {
    it('submits one field per edit, as a per-cell write did', async () => {
      const submit = vi.fn().mockResolvedValue(undefined);
      const { result } = setup(submit);

      await act(() =>
        result.current.rowChanges.stageCellValue('7', 'name', 'Renamed'),
      );

      expect(submit).toHaveBeenCalledTimes(1);
      expect(submit).toHaveBeenCalledWith('7', { name: 'Renamed' });
    });

    it('reports the tick and clears the staged value on success', async () => {
      const { result } = setup(() => undefined);

      await act(() =>
        result.current.rowChanges.stageCellValue('7', 'name', 'Renamed'),
      );

      expect(result.current.cellStatus.statuses[NAME]).toEqual({
        kind: 'saved',
      });
      expect(
        result.current.rowChanges.stagedCellValue('7', 'name'),
      ).toBeUndefined();
      expect(result.current.rowChanges.hasStagedChanges('7')).toBe(false);
    });

    it('attributes a field error to its cell and keeps the value', async () => {
      const { result } = setup(() => ({
        error: 'Name taken',
        fieldErrors: { name: ['Name taken'] },
      }));

      await act(() =>
        result.current.rowChanges.stageCellValue('7', 'name', 'Taken'),
      );

      expect(result.current.cellStatus.statuses[NAME]).toEqual({
        kind: 'error',
        message: 'Name taken',
      });
      expect(result.current.cellStatus.rejectedCellValue('7', 'name')).toBe(
        'Taken',
      );
    });

    it('falls back to the plain message when nothing is attributed', async () => {
      const { result } = setup(() => ({ error: 'Something went wrong' }));

      await act(() =>
        result.current.rowChanges.stageCellValue('7', 'name', 'Renamed'),
      );

      expect(result.current.cellStatus.statuses[NAME]).toEqual({
        kind: 'error',
        message: 'Something went wrong',
      });
    });

    it('reports a transport failure on the cells it tried to save', async () => {
      const { result } = setup(() => {
        throw new Error('offline');
      });

      await act(() =>
        result.current.rowChanges.stageCellValue('7', 'name', 'Renamed'),
      );

      expect(result.current.cellStatus.statuses[NAME]).toEqual({
        kind: 'error',
        message: 'Could not save. Check your connection.',
      });
      expect(result.current.cellStatus.rejectedCellValue('7', 'name')).toBe(
        'Renamed',
      );
    });
  });

  describe('debounced flush', () => {
    it('aggregates several fields of one row into a single write', async () => {
      vi.useFakeTimers();
      try {
        const submit = vi.fn().mockResolvedValue(undefined);
        const { result } = setup(submit, { debounce: 500 });

        act(() => {
          void result.current.rowChanges.stageCellValue('7', 'name', 'Renamed');
          void result.current.rowChanges.stageCellValue(
            '7',
            'description',
            'New description',
          );
        });

        // Nothing sent yet, and both cells say so.
        expect(submit).not.toHaveBeenCalled();
        expect(result.current.cellStatus.statuses[NAME]).toEqual({
          kind: 'dirty',
        });
        expect(result.current.cellStatus.statuses[DESC]).toEqual({
          kind: 'dirty',
        });

        await act(async () => {
          vi.advanceTimersByTime(500);
        });

        expect(submit).toHaveBeenCalledTimes(1);
        expect(submit).toHaveBeenCalledWith('7', {
          name: 'Renamed',
          description: 'New description',
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('keeps rows separate — each flushes its own changes', async () => {
      vi.useFakeTimers();
      try {
        const submit = vi.fn().mockResolvedValue(undefined);
        const { result } = setup(submit, { debounce: 500 });

        act(() => {
          void result.current.rowChanges.stageCellValue('7', 'name', 'Seven');
          void result.current.rowChanges.stageCellValue('8', 'name', 'Eight');
        });
        await act(async () => {
          vi.advanceTimersByTime(500);
        });

        expect(submit).toHaveBeenCalledTimes(2);
        expect(submit).toHaveBeenCalledWith('7', { name: 'Seven' });
        expect(submit).toHaveBeenCalledWith('8', { name: 'Eight' });
      } finally {
        vi.useRealTimers();
      }
    });

    // The whole write is refused, so a cell with no error of its own is still
    // unsaved. Showing it as saved would be a lie.
    it('leaves the rest of a failed batch dirty, not saved', async () => {
      vi.useFakeTimers();
      try {
        const { result } = setup(
          () => ({
            error: 'Name taken',
            fieldErrors: { name: ['Name taken'] },
          }),
          { debounce: 500 },
        );

        act(() => {
          void result.current.rowChanges.stageCellValue('7', 'name', 'Taken');
          void result.current.rowChanges.stageCellValue(
            '7',
            'description',
            'Fine',
          );
        });
        await act(async () => {
          vi.advanceTimersByTime(500);
        });

        expect(result.current.cellStatus.statuses[NAME]).toEqual({
          kind: 'error',
          message: 'Name taken',
        });
        expect(result.current.cellStatus.statuses[DESC]).toEqual({
          kind: 'dirty',
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('flushes everything queued on demand', async () => {
      vi.useFakeTimers();
      try {
        const submit = vi.fn().mockResolvedValue(undefined);
        const { result } = setup(submit, { debounce: 10_000 });

        act(() => {
          void result.current.rowChanges.stageCellValue('7', 'name', 'Seven');
        });
        await act(() => result.current.rowChanges.flushAll());

        expect(submit).toHaveBeenCalledWith('7', { name: 'Seven' });
      } finally {
        vi.useRealTimers();
      }
    });

    it('discards a staged value without sending it', async () => {
      vi.useFakeTimers();
      try {
        const submit = vi.fn().mockResolvedValue(undefined);
        const { result } = setup(submit, { debounce: 500 });

        act(() => {
          void result.current.rowChanges.stageCellValue('7', 'name', 'Typo');
        });
        act(() => result.current.rowChanges.discardCellValue('7', 'name'));
        await act(async () => {
          vi.advanceTimersByTime(500);
        });

        expect(submit).not.toHaveBeenCalled();
        expect(result.current.cellStatus.statuses[NAME]).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // Two concurrent PATCHes for one row would land in arbitrary order, so the
  // later value could lose to the earlier one.
  it('never runs two writes for one row at once, however many queue up', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let releaseFirst: (() => void) | undefined;
    const submit = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      if (submit.mock.calls.length === 1) {
        await new Promise<void>((resolve) => {
          releaseFirst = resolve;
        });
      } else {
        await Promise.resolve();
      }
      inFlight -= 1;
      return undefined;
    });
    const { result } = setup(submit);

    await act(async () => {
      const { stageCellValue } = result.current.rowChanges;
      const flushes = [
        stageCellValue('7', 'name', 'First'),
        // Both queue behind the first write while it is still in flight.
        stageCellValue('7', 'name', 'Second'),
        stageCellValue('7', 'description', 'Third'),
      ];
      releaseFirst?.();
      await Promise.all(flushes);
    });

    expect(maxInFlight).toBe(1);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit).toHaveBeenLastCalledWith('7', {
      name: 'Second',
      description: 'Third',
    });
  });

  it('serialises writes per row rather than racing them', async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const submit = vi.fn(
      async (_rowId: string, changes: Record<string, string>) => {
        order.push(`start:${changes.name}`);
        if (changes.name === 'First') {
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
        }
        order.push(`end:${changes.name}`);
        return undefined;
      },
    );

    const { result } = setup(submit);

    let firstFlush: Promise<void> | undefined;
    let secondFlush: Promise<void> | undefined;
    await act(async () => {
      firstFlush = result.current.rowChanges.stageCellValue(
        '7',
        'name',
        'First',
      );
      secondFlush = result.current.rowChanges.stageCellValue(
        '7',
        'name',
        'Second',
      );
      // The second waits for the first to settle before it reads the buffer.
      releaseFirst?.();
      await Promise.all([firstFlush, secondFlush]);
    });

    expect(order).toEqual([
      'start:First',
      'end:First',
      'start:Second',
      'end:Second',
    ]);
  });
});
