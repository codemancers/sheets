import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import { useSheet, type SheetFeatures } from '../hooks/use-sheet.js';
import { canDropOn, moveColumn, moveTargets } from './column-order.js';

type Row = { a: string; b: string; c: string; d: string; e: string };
const col = createColumnHelper<SheetFeatures, Row>();
const data: Row[] = [];

function sheet(
  columns: Parameters<typeof useSheet<Row>>[0]['columns'],
  options: Partial<Parameters<typeof useSheet<Row>>[0]> = {},
) {
  const { result } = renderHook(() =>
    useSheet<Row>({ columns, data, ...options }),
  );
  const table = result.current.table;
  const column = (id: string) => {
    const found = table.getColumn(id);
    if (!found) throw new Error(`No column ${id}`);
    return found;
  };
  const order = () => table.getAllLeafColumns().map((leaf) => leaf.id);
  const move = (id: string, target: string, side: 'before' | 'after') => {
    let moved = false;
    act(() => {
      moved = moveColumn(table, column(id), column(target), side);
    });
    return moved;
  };
  const targets = (id: string) => {
    const { before, after } = moveTargets(table, column(id));
    return { before: before?.id, after: after?.id };
  };
  return { table, column, order, move, targets };
}

const flat = col.columns([
  col.accessor('a', {}),
  col.accessor('b', {}),
  col.accessor('c', {}),
]);

describe('column order', () => {
  it('moves a column before or after another', () => {
    const { move, order, targets } = sheet(flat);
    expect(targets('a')).toEqual({ before: undefined, after: 'b' });
    expect(targets('c')).toEqual({ before: 'b', after: undefined });

    expect(move('a', 'b', 'after')).toBe(true);
    expect(order()).toEqual(['b', 'a', 'c']);
    move('c', 'b', 'before');
    expect(order()).toEqual(['c', 'b', 'a']);
  });

  it('writes the whole order, though TanStack starts it empty', () => {
    const { table, move } = sheet(flat);
    expect(table.atoms.columnOrder.get()).toEqual([]);
    move('c', 'a', 'before');
    expect(table.atoms.columnOrder.get()).toEqual(['c', 'a', 'b']);
  });

  it('moves nothing when the column is already there', () => {
    const { table, move } = sheet(flat);
    expect(move('a', 'b', 'before')).toBe(false);
    expect(table.atoms.columnOrder.get()).toEqual([]);
  });

  it('keeps a fixed column where it is, and moves others around it', () => {
    const { move, order, targets } = sheet(
      col.columns([
        col.accessor('a', {}),
        col.accessor('b', { meta: { enableColumnOrdering: false } }),
        col.accessor('c', {}),
      ]),
    );
    expect(targets('b')).toEqual({ before: undefined, after: undefined });
    expect(targets('a')).toEqual({ before: undefined, after: 'c' });
    expect(move('a', 'b', 'after')).toBe(false);

    move('a', 'c', 'after');
    expect(order()).toEqual(['c', 'b', 'a']);
  });

  it('steps over hidden columns, which keep their places', () => {
    const { move, order, targets } = sheet(flat, {
      initialState: { columnVisibility: { b: false } },
    });
    expect(targets('a')).toEqual({ before: undefined, after: 'c' });
    move('a', 'c', 'after');
    expect(order()).toEqual(['c', 'b', 'a']);
  });

  it('starts from a saved order, dropping columns that are gone', () => {
    const { table, move, order } = sheet(flat, {
      initialState: { columnOrder: ['c', 'gone', 'a'] },
    });
    expect(order()).toEqual(['c', 'a', 'b']);
    move('b', 'a', 'before');
    expect(table.atoms.columnOrder.get()).toEqual(['c', 'b', 'a']);
  });

  describe('with groups', () => {
    const grouped = col.columns([
      col.group({
        id: 'g',
        header: 'G',
        columns: col.columns([col.accessor('a', {}), col.accessor('b', {})]),
      }),
      col.accessor('c', {}),
      col.group({
        id: 'h',
        header: 'H',
        columns: col.columns([col.accessor('d', {}), col.accessor('e', {})]),
      }),
    ]);

    it('keeps a column in its group', () => {
      const { table, column, move, order, targets } = sheet(grouped);
      expect(targets('b')).toEqual({ before: 'a', after: undefined });
      expect(canDropOn(table, column('b'), column('c'))).toBe(false);

      move('b', 'a', 'before');
      expect(order()).toEqual(['b', 'a', 'c', 'd', 'e']);
    });

    it('moves a column outside a group past the whole group', () => {
      const { table, column, move, order, targets } = sheet(grouped);
      expect(targets('c')).toEqual({ before: 'g', after: 'h' });
      expect(canDropOn(table, column('c'), column('g'))).toBe(true);
      expect(canDropOn(table, column('c'), column('a'))).toBe(false);

      move('c', 'h', 'after');
      expect(order()).toEqual(['a', 'b', 'd', 'e', 'c']);
      move('c', 'g', 'before');
      expect(order()).toEqual(['c', 'a', 'b', 'd', 'e']);
    });
  });
});
