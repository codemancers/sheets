import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SortingState } from '@tanstack/react-table';
import { defineSheetColumn } from './define-sheet-column.js';
import { useSheet } from './use-sheet.js';

type Row = { id: string; name: string };

const columns = [
  defineSheetColumn<Row>({
    id: 'name',
    header: 'Name',
    accessor: 'name',
    sortable: true,
  }),
];
const data: Row[] = [
  { id: '1', name: 'b' },
  { id: '2', name: 'a' },
];

describe('useSheet', () => {
  describe('state the app does not control', () => {
    it('resizes columns', () => {
      const { result } = renderHook(() => useSheet({ columns, data }));

      act(() => result.current.table.setColumnSizing({ name: 240 }));

      expect(result.current.table.getColumn('name')?.getSize()).toBe(240);
    });

    it('sorts', () => {
      const { result } = renderHook(() => useSheet({ columns, data }));

      act(() => result.current.table.getColumn('name')?.toggleSorting(false));

      expect(result.current.table.getState().sorting).toEqual([
        { id: 'name', desc: false },
      ]);
    });
  });

  describe('state the app controls', () => {
    it('leaves the state to the app and reports the change', () => {
      const onSortingChange = vi.fn();
      const { result } = renderHook(() =>
        useSheet({ columns, data, state: { sorting: [] }, onSortingChange }),
      );

      act(() => result.current.table.getColumn('name')?.toggleSorting(false));

      expect(result.current.table.getState().sorting).toEqual([]);
      expect(onSortingChange).toHaveBeenCalledTimes(1);
    });

    it('passes TanStack updaters through, so a state setter works as is', () => {
      let sorting: SortingState = [];
      const { result, rerender } = renderHook(() =>
        useSheet({
          columns,
          data,
          state: { sorting },
          onSortingChange: (updater) => {
            sorting =
              typeof updater === 'function' ? updater(sorting) : updater;
          },
        }),
      );

      act(() => result.current.table.getColumn('name')?.toggleSorting(true));
      rerender();

      expect(result.current.table.getState().sorting).toEqual([
        { id: 'name', desc: true },
      ]);
    });
  });
});
