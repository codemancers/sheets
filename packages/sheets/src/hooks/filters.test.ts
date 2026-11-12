import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import { textFilter, valuesFilter } from './filters.js';
import { useSheet } from './use-sheet.js';

type Row = { id: string; name: string; status: string };

const column = createColumnHelper<Row>();
const columns = [
  column.accessor('name', { filterFn: textFilter }),
  column.accessor('status', { filterFn: valuesFilter }),
];
const data: Row[] = [
  { id: '1', name: 'Alpha', status: 'Todo' },
  { id: '2', name: 'Beta', status: 'Done' },
  { id: '3', name: 'alphabet', status: 'In progress' },
];

function filterBy(columnId: string, value: unknown) {
  const { result } = renderHook(() =>
    useSheet({ columns, data, getRowId: (row) => row.id }),
  );
  act(() => result.current.table.getColumn(columnId)?.setFilterValue(value));
  return {
    ids: result.current.table.getRowModel().rows.map((row) => row.id),
    filters: result.current.table.getState().columnFilters,
  };
}

describe('textFilter', () => {
  it('keeps the rows that contain the text, ignoring case', () => {
    expect(filterBy('name', 'ALPHA').ids).toEqual(['1', '3']);
  });

  it('drops the filter when the text is cleared', () => {
    expect(filterBy('name', '').filters).toEqual([]);
  });
});

describe('valuesFilter', () => {
  it('keeps the rows whose value is one of the picked values', () => {
    expect(filterBy('status', ['Todo', 'Done']).ids).toEqual(['1', '2']);
  });

  it('matches whole values, not parts of them', () => {
    expect(filterBy('status', ['progress']).ids).toEqual([]);
  });

  it('drops the filter when nothing is picked', () => {
    const { ids, filters } = filterBy('status', []);

    expect(filters).toEqual([]);
    expect(ids).toEqual(['1', '2', '3']);
  });
});
