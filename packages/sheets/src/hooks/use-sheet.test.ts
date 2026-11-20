import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createColumnHelper,
  sortFn_textCaseSensitive,
  type SortingState,
} from '@tanstack/react-table';
import { useCellStatus } from './use-cell-status.js';
import {
  useSheet,
  type SheetColumnDef,
  type SheetFeatures,
} from './use-sheet.js';

type Row = { id: string; name: string };

const column = createColumnHelper<SheetFeatures, Row>();
const columns = column.columns([column.accessor('name', { header: 'Name' })]);
const data: Row[] = [
  { id: '1', name: 'b' },
  { id: '2', name: 'a' },
];
const names = (result: {
  current: { table: { getRowModel: () => { rows: { original: Row }[] } } };
}) => result.current.table.getRowModel().rows.map((row) => row.original.name);

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

    expect(result.current.table.state.sorting).toEqual([
      { id: 'name', desc: false },
    ]);
    expect(names(result)).toEqual(['b', 'a']);
  });

  it('resizes columns without the app controlling sizing or re-rendering', () => {
    const renders = vi.fn();
    const { result } = renderHook(() => {
      renders();
      return useSheet({ columns, data });
    });
    const before = renders.mock.calls.length;

    act(() => result.current.table.setColumnSizing({ name: 240 }));

    expect(renders.mock.calls.length).toBe(before);
    expect(result.current.table.atoms.columnSizing.get()).toEqual({
      name: 240,
    });
    expect(result.current.table.getColumn('name')?.getSize()).toBe(240);
  });

  it('keeps every state slice but the column widths in table.state', () => {
    const { result } = renderHook(() => useSheet({ columns, data }));
    const { table } = result.current;
    const resizing = ['columnSizing', 'columnResizing'];

    expect(Object.keys(table.state).sort()).toEqual(
      Object.keys(table.atoms)
        .filter((key) => !resizing.includes(key))
        .sort(),
    );
  });

  it("counts a column's values, for its filter", () => {
    const { result } = renderHook(() =>
      useSheet({ columns, data: [...data, { id: '3', name: 'a' }] }),
    );

    expect(
      result.current.table.getColumn('name')?.getFacetedUniqueValues(),
    ).toEqual(
      new Map([
        ['b', 1],
        ['a', 2],
      ]),
    );
  });

  it('sorts numbers and dates without a sortFn', () => {
    type Entry = { id: string; count: number; on: Date };
    const entries: Entry[] = [
      { id: '1', count: 10, on: new Date('2026-03-01') },
      { id: '2', count: 9, on: new Date('2026-01-01') },
    ];
    const entryColumns: SheetColumnDef<Entry>[] = [
      { accessorKey: 'count' },
      { accessorKey: 'on' },
    ];
    const { result } = renderHook(() =>
      useSheet({ columns: entryColumns, data: entries }),
    );
    const ids = () =>
      result.current.table.getRowModel().rows.map((row) => row.original.id);

    act(() => result.current.table.getColumn('count')?.toggleSorting(false));
    expect(ids()).toEqual(['2', '1']);

    act(() => result.current.table.getColumn('on')?.toggleSorting(false));
    expect(ids()).toEqual(['2', '1']);
  });

  it('filters across columns with the global filter', () => {
    const { result } = renderHook(() => useSheet({ columns, data }));

    act(() => result.current.table.setGlobalFilter('a'));

    expect(names(result)).toEqual(['a']);
  });

  it('reorders columns', () => {
    const twoColumns = column.columns([
      column.accessor('id', {}),
      column.accessor('name', {}),
    ]);
    const { result } = renderHook(() =>
      useSheet({ columns: twoColumns, data }),
    );

    act(() => result.current.table.setColumnOrder(['name', 'id']));

    expect(
      result.current.table.getVisibleLeafColumns().map((leaf) => leaf.id),
    ).toEqual(['name', 'id']);
  });

  // A custom sort function goes straight on the column, as v9's docs show:
  // the sheet's feature set is fixed, so nothing is registered by name.
  it('sorts with a function set on the column', () => {
    const mixed: Row[] = [
      { id: '1', name: 'b' },
      { id: '2', name: 'B' },
      { id: '3', name: 'a' },
    ];
    const { result } = renderHook(() =>
      useSheet({
        columns: column.columns([
          column.accessor('name', { sortFn: sortFn_textCaseSensitive }),
        ]),
        data: mixed,
      }),
    );

    act(() => result.current.table.getColumn('name')?.toggleSorting(false));

    expect(names(result)).toEqual(['B', 'a', 'b']);
  });

  describe('controlled state', () => {
    it('leaves the state to the app and reports the change', () => {
      const onSortingChange = vi.fn();
      const { result } = renderHook(() =>
        useSheet({ columns, data, state: { sorting: [] }, onSortingChange }),
      );

      act(() => result.current.table.getColumn('name')?.toggleSorting(false));

      expect(result.current.table.state.sorting).toEqual([]);
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

      expect(result.current.table.state.sorting).toEqual([
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

  // Cells report validation and save failures through it, so every sheet
  // needs one, not only those that save per row.
  describe('cellStatus', () => {
    it('provides its own when none is passed', () => {
      const { result, rerender } = renderHook(() =>
        useSheet({ columns, data }),
      );
      const first = result.current.cellStatus;

      rerender();

      expect(first.statuses).toEqual({});
      expect(result.current.cellStatus).toBe(first);
    });

    it('uses the one it is given', () => {
      const { result } = renderHook(() => {
        const cellStatus = useCellStatus();
        return { cellStatus, sheet: useSheet({ columns, data, cellStatus }) };
      });

      expect(result.current.sheet.cellStatus).toBe(result.current.cellStatus);
    });
  });
});
