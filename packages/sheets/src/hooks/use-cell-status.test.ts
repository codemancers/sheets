import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { cellStatusKey, useCellStatus } from './use-cell-status.js';

const KEY = cellStatusKey('7', 'name');

describe('useCellStatus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keys statuses by row and column so cells are independent', () => {
    const { result } = renderHook(() => useCellStatus());

    act(() => {
      result.current.rejectCellValue('7', 'name', 'Name taken');
      result.current.rejectCellValue('7', 'goal', 'Too long');
    });

    expect(result.current.statuses[KEY]).toEqual({
      kind: 'error',
      message: 'Name taken',
    });
    expect(result.current.statuses[cellStatusKey('7', 'goal')]).toEqual({
      kind: 'error',
      message: 'Too long',
    });
  });

  // An error describes a condition that is still true, so expiring it would only
  // remove the evidence that the write failed.
  it('keeps errors indefinitely', () => {
    const { result } = renderHook(() => useCellStatus());

    act(() => result.current.rejectCellValue('7', 'name', 'Name taken'));
    act(() => vi.advanceTimersByTime(120_000));

    expect(result.current.statuses[KEY]).toEqual({
      kind: 'error',
      message: 'Name taken',
    });
  });

  it('clears the tick on its own, since there is nothing to act on', () => {
    const { result } = renderHook(() => useCellStatus());

    act(() => result.current.setCellSaved('7', 'name'));
    expect(result.current.statuses[KEY]).toEqual({ kind: 'saved' });

    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.statuses[KEY]).toBeUndefined();
  });

  // Otherwise the first tick's timer cuts the second status short.
  it('restarts the countdown when the same cell reports again', () => {
    const { result } = renderHook(() => useCellStatus());

    act(() => result.current.setCellSaved('7', 'name'));
    act(() => vi.advanceTimersByTime(1500));
    act(() => result.current.setCellSaved('7', 'name'));

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.statuses[KEY]).toEqual({ kind: 'saved' });

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.statuses[KEY]).toBeUndefined();
  });

  it('drops pending timers on unmount rather than setting state on a dead hook', () => {
    const { result, unmount } = renderHook(() => useCellStatus());

    act(() => result.current.setCellSaved('7', 'name'));
    unmount();

    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });

  describe('rejected values', () => {
    it('records the refused value alongside the error', () => {
      const { result } = renderHook(() => useCellStatus());

      act(() =>
        result.current.rejectCellValue('7', 'name', 'Name taken', 'Taken Name'),
      );

      expect(result.current.rejectedCellValue('7', 'name')).toBe('Taken Name');
      expect(result.current.statuses[KEY]).toEqual({
        kind: 'error',
        message: 'Name taken',
      });
    });

    // The lifetimes differ on purpose: the icon has done its job once the user
    // reopens the cell, but the value must survive so a typo can be fixed.
    it('keeps the value when only the status is cleared', () => {
      const { result } = renderHook(() => useCellStatus());

      act(() =>
        result.current.rejectCellValue('7', 'name', 'Name taken', 'Taken Name'),
      );
      act(() => result.current.clearCellStatus('7', 'name'));

      expect(result.current.statuses[KEY]).toBeUndefined();
      expect(result.current.rejectedCellValue('7', 'name')).toBe('Taken Name');
    });

    it('drops both when the change is abandoned', () => {
      const { result } = renderHook(() => useCellStatus());

      act(() =>
        result.current.rejectCellValue('7', 'name', 'Name taken', 'Taken Name'),
      );
      act(() => result.current.abandonCellValueChange('7', 'name'));

      expect(result.current.statuses[KEY]).toBeUndefined();
      expect(result.current.rejectedCellValue('7', 'name')).toBeUndefined();
    });

    it('drops the value on a later success, so the tick is not attached to it', () => {
      const { result } = renderHook(() => useCellStatus());

      act(() =>
        result.current.rejectCellValue('7', 'name', 'Name taken', 'Taken Name'),
      );
      act(() => result.current.setCellSaved('7', 'name'));

      expect(result.current.rejectedCellValue('7', 'name')).toBeUndefined();
      expect(result.current.statuses[KEY]).toEqual({ kind: 'saved' });
    });
  });

  describe('rejectFieldErrors', () => {
    it("maps an API's field-keyed errors onto the matching cells", () => {
      const { result } = renderHook(() => useCellStatus());

      act(() => {
        result.current.rejectFieldErrors(
          '7',
          { name: ['Name taken'], description: ['Too short'] },
          { values: { name: 'Taken Name' } },
        );
      });

      expect(result.current.statuses[KEY]).toEqual({
        kind: 'error',
        message: 'Name taken',
      });
      expect(
        result.current.statuses[cellStatusKey('7', 'description')],
      ).toEqual({ kind: 'error', message: 'Too short' });
      expect(result.current.rejectedCellValue('7', 'name')).toBe('Taken Name');
      // No attempted value supplied for description, so nothing is retained.
      expect(
        result.current.rejectedCellValue('7', 'description'),
      ).toBeUndefined();
    });

    it('translates a payload field to a differently named column', () => {
      const { result } = renderHook(() => useCellStatus());

      act(() => {
        result.current.rejectFieldErrors(
          '7',
          { project_name: ['Name taken'] },
          { fieldToColumn: { project_name: 'name' } },
        );
      });

      expect(result.current.statuses[KEY]).toEqual({
        kind: 'error',
        message: 'Name taken',
      });
    });

    // Silently dropping these would leave the user with a failed write and no
    // explanation anywhere.
    it('reports fields it could not place on a column', () => {
      const { result } = renderHook(() => useCellStatus());

      let unmapped: Record<string, string[]> = {};
      act(() => {
        unmapped = result.current.rejectFieldErrors(
          '7',
          { name: ['Name taken'], organisationId: ['Not permitted'] },
          { columnIds: ['name'] },
        ).unmapped;
      });

      expect(Object.keys(unmapped)).toEqual(['organisationId']);
      expect(result.current.statuses[KEY]).toEqual({
        kind: 'error',
        message: 'Name taken',
      });
    });
  });
});
