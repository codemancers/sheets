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

  describe('accessibility', () => {
    type Task = { id: string; title: string };

    function TaskSheet({ isLoading = false }: { isLoading?: boolean }) {
      const sheet = useSheet({
        columns: [
          defineSheetColumn<Task>({
            id: 'title',
            header: 'Title',
            accessor: 'title',
            sortable: true,
            width: 200,
            cell: ({ row }) => (
              <SheetEditableTextCell value={row.original.title} />
            ),
          }),
        ],
        data: [{ id: '1', title: 'Alpha' }],
        getRowId: (task) => task.id,
      });
      return (
        <Sheet
          instance={sheet}
          isLoading={isLoading}
          showAddRow
          onAddRow={() => undefined}
        />
      );
    }

    it('names the row-number column', () => {
      render(<TaskSheet />);

      expect(screen.getByRole('columnheader', { name: 'Row' })).toBeTruthy();
    });

    it('announces the sort order on the column header', () => {
      render(<TaskSheet />);
      const header = screen.getByRole('columnheader', { name: /Title/ });
      expect(header.getAttribute('aria-sort')).toBe('none');

      fireEvent.click(screen.getByRole('button', { name: 'Sort Title' }));

      expect(header.getAttribute('aria-sort')).toBe('ascending');
    });

    it('resizes a column from the keyboard', () => {
      render(<TaskSheet />);
      const handle = screen.getByRole('separator', { name: 'Resize Title' });
      expect(handle.getAttribute('aria-valuenow')).toBe('200');

      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(handle.getAttribute('aria-valuenow')).toBe('210');

      fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
      expect(handle.getAttribute('aria-valuenow')).toBe('160');

      fireEvent.doubleClick(handle);
      expect(handle.getAttribute('aria-valuenow')).toBe('200');
    });

    it('names the editor after its column', () => {
      render(<TaskSheet />);

      fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));

      expect(screen.getByRole('textbox', { name: 'Title' })).toBeTruthy();
    });

    it.each(['Enter', 'Escape'])(
      'returns focus to the cell when %s closes the editor',
      (key) => {
        render(<TaskSheet />);
        fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));

        fireEvent.keyDown(screen.getByRole('textbox'), { key });

        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Alpha' }),
        );
      },
    );

    it('marks the rows busy while loading, hiding the placeholders', () => {
      render(<TaskSheet isLoading />);

      expect(screen.getByRole('rowgroup', { busy: true })).toBeTruthy();
      // Only the header row: the skeleton rows are hidden.
      expect(screen.getAllByRole('row')).toHaveLength(1);
    });

    it('puts the add-row button in a row of the table', () => {
      render(<TaskSheet />);

      const cell = screen
        .getByRole('button', { name: 'Add row' })
        .closest('[role="cell"]');
      expect(cell?.parentElement?.getAttribute('role')).toBe('row');
    });
  });
});
