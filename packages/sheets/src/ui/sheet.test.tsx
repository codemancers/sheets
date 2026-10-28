import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defineSheetColumn } from '../hooks/index.js';
import { useSheet } from '../hooks/use-sheet.js';
import { Sheet } from './sheet.js';
import { SheetEditableTextCell } from './cells/editable-text-cell.js';

type Row = { id: number; name: string };

function TestSheet({
  data,
  isLoading = false,
}: {
  data: Row[];
  isLoading?: boolean;
}) {
  const sheet = useSheet({
    columns: [
      defineSheetColumn<Row>({
        id: 'name',
        header: 'Name',
        accessor: 'name',
      }),
    ],
    data,
    getRowId: (row) => String(row.id),
  });

  return (
    <Sheet instance={sheet} isLoading={isLoading} emptyState="No rows yet." />
  );
}

describe('Sheet', () => {
  it('renders the empty state inside the sheet shell', () => {
    render(<TestSheet data={[]} />);

    expect(screen.getByText('No rows yet.')).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('renders the loading state inside the sheet shell', () => {
    render(<TestSheet data={[]} isLoading />);

    expect(screen.getByRole('rowgroup', { busy: true })).toBeTruthy();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
  });

  // An inline columns array is rebuilt on every render. That must not remount
  // the cells, or any open editor closes and loses what was typed.
  it('keeps an open editor through a render that rebuilds the columns', () => {
    function InlineColumns() {
      const sheet = useSheet({
        columns: [
          defineSheetColumn<Row>({
            id: 'name',
            header: 'Name',
            accessor: 'name',
            cell: ({ row }) => (
              <SheetEditableTextCell value={row.original.name} />
            ),
          }),
        ],
        data: [{ id: 1, name: 'Alpha' }],
        getRowId: (row) => String(row.id),
      });
      return <Sheet instance={sheet} />;
    }
    const { rerender } = render(<InlineColumns />);

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Alph' },
    });
    rerender(<InlineColumns />);

    expect(screen.getByRole('textbox')).toHaveProperty('value', 'Alph');
  });

  it('renders a column without a cell renderer as a padded text cell', () => {
    render(<TestSheet data={[{ id: 1, name: 'Alpha' }]} />);

    expect(screen.getByText('Alpha').className).toContain('truncate');
  });
});
