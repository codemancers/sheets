import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { useSheet } from './use-sheet.js';

type Row = { id: string; name: string };

const column = createColumnHelper<Row>();
const columns = [column.accessor('name', { header: 'Name' })];
const data: Row[] = [
  { id: '1', name: 'b' },
  { id: '2', name: 'a' },
];
const names = (result: { current: ReturnType<typeof useSheet<Row>> }) =>
  result.current.table.getRowModel().rows.map((row) => row.original.name);

describe('useSheet', () => {
  it('sorts in the browser by default', () => {
    const { result } = renderHook(() => useSheet({ columns, data }));

    act(() => result.current.table.getColumn('name')?.toggleSorting(false));

    expect(names(result)).toEqual(['a', 'b']);
  });

  it('leaves the data alone with manualSorting, for server-side sorting', () => {
    const { result } = renderHook(() =>
      useSheet({ columns, data, manualSorting: true }),
    );

    act(() => result.current.table.getColumn('name')?.toggleSorting(false));

    expect(result.current.table.getState().sorting).toEqual([
      { id: 'name', desc: false },
    ]);
    expect(names(result)).toEqual(['b', 'a']);
  });

  it('resizes columns without the app controlling sizing', () => {
    const { result } = renderHook(() => useSheet({ columns, data }));

    act(() => result.current.table.setColumnSizing({ name: 240 }));

    expect(result.current.table.getColumn('name')?.getSize()).toBe(240);
  });

  describe('controlled state', () => {
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

    // TanStack spreads options over its defaults, so an explicit undefined
    // would knock out its own state handling.
    it('ignores options passed as undefined', () => {
      const { result } = renderHook(() =>
        useSheet({
          columns,
          data,
          onSortingChange: undefined,
          state: { sorting: undefined },
        }),
      );

      act(() => result.current.table.getColumn('name')?.toggleSorting(false));

      expect(names(result)).toEqual(['a', 'b']);
    });
  });
});
