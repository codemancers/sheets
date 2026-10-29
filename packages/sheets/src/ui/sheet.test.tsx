import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import { useSheet } from '../hooks/use-sheet.js';
import { Sheet } from './sheet.js';
import { SheetEditableTextCell } from './cells/editable-text-cell.js';
import type { SheetLabels } from './labels.js';

type Row = { id: number; name: string };
const rowColumn = createColumnHelper<Row>();

function TestSheet({
  data,
  isLoading = false,
}: {
  data: Row[];
  isLoading?: boolean;
}) {
  const sheet = useSheet({
    columns: [rowColumn.accessor('name', { header: 'Name' })],
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
          rowColumn.accessor('name', {
            header: 'Name',
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

  it('renders function headers, and group headers spanning their columns', () => {
    type Person = { id: string; first: string; last: string; age: number };
    const person = createColumnHelper<Person>();
    function Grouped() {
      const sheet = useSheet({
        columns: [
          person.group({
            id: 'name',
            header: 'Name',
            columns: [
              person.accessor('first', { header: 'First' }),
              person.accessor('last', { header: () => <em>Last</em> }),
            ],
          }),
          person.accessor('age', { header: 'Age' }),
        ],
        data: [{ id: '1', first: 'Ada', last: 'Lovelace', age: 36 }],
        getRowId: (p) => p.id,
      });
      return <Sheet instance={sheet} />;
    }
    render(<Grouped />);

    expect(
      screen.getByRole('columnheader', { name: 'Name' }).style.gridColumn,
    ).toBe('span 2');
    expect(screen.getByText('Last').tagName).toBe('EM');
    const [head] = screen.getAllByRole('rowgroup');
    expect(within(head).getAllByRole('row')).toHaveLength(2);
  });

  it('marks the row open in a drawer as the current one', () => {
    function WithOpenRow() {
      const sheet = useSheet({
        columns: [rowColumn.accessor('name', { header: 'Name' })],
        data: [
          { id: 1, name: 'Alpha' },
          { id: 2, name: 'Beta' },
        ],
        getRowId: (row) => String(row.id),
      });
      return <Sheet instance={sheet} openRowId="2" />;
    }
    render(<WithOpenRow />);

    const [, alpha, beta] = screen.getAllByRole('row');
    expect(alpha.getAttribute('aria-current')).toBeNull();
    expect(beta.getAttribute('aria-current')).toBe('true');
  });

  describe('accessibility', () => {
    type Task = { id: string; title: string };
    const taskColumn = createColumnHelper<Task>();

    function TaskSheet({
      isLoading = false,
      labels,
    }: {
      isLoading?: boolean;
      labels?: Partial<SheetLabels>;
    }) {
      const sheet = useSheet({
        columns: [
          taskColumn.accessor('title', {
            header: 'Title',
            size: 200,
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
          labels={labels}
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

    it('renders its own text from labels', () => {
      render(
        <TaskSheet
          labels={{
            rowNumber: 'Fila',
            sort: (column) => `Ordenar ${column}`,
            resize: (column) => `Redimensionar ${column}`,
            width: (pixels) => `${pixels} píxeles`,
            addRow: 'Añadir fila',
          }}
        />,
      );

      expect(screen.getByRole('columnheader', { name: 'Fila' })).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Ordenar Title' }),
      ).toBeTruthy();
      expect(
        screen
          .getByRole('separator', { name: 'Redimensionar Title' })
          .getAttribute('aria-valuetext'),
      ).toBe('200 píxeles');
      expect(screen.getByRole('button', { name: 'Añadir fila' })).toBeTruthy();
    });

    it('shows the empty label in a cell of the table', () => {
      function Empty() {
        const sheet = useSheet({
          columns: [rowColumn.accessor('name', {})],
          data: [],
        });
        return <Sheet instance={sheet} labels={{ empty: 'Sin datos' }} />;
      }
      render(<Empty />);

      expect(screen.getByRole('cell').textContent).toBe('Sin datos');
    });
  });

  // TanStack's advice for live resizing: only the header and the column
  // widths should change while a column is dragged.
  it('does not re-render the rows while a column is dragged', () => {
    type Task = { id: string; title: string };
    const taskColumn = createColumnHelper<Task>();
    const cellRenders = vi.fn();
    const columns = [
      taskColumn.accessor('title', {
        header: 'Title',
        size: 200,
        cell: ({ getValue }) => {
          cellRenders();
          return getValue();
        },
      }),
    ];
    const data = [{ id: '1', title: 'Alpha' }];
    function DragSheet() {
      const sheet = useSheet({ columns, data, getRowId: (task) => task.id });
      return <Sheet instance={sheet} />;
    }
    render(<DragSheet />);
    const handle = screen.getByRole('separator', { name: 'Resize Title' });
    const root = screen.getByRole('table');

    fireEvent.mouseDown(handle, { clientX: 100 });
    const before = cellRenders.mock.calls.length;
    fireEvent.mouseMove(document, { clientX: 140 });
    fireEvent.mouseMove(document, { clientX: 180 });

    expect(root.style.getPropertyValue('--sheet-columns')).toContain('280px');
    expect(cellRenders.mock.calls.length).toBe(before);

    fireEvent.mouseUp(document, { clientX: 180 });
  });
});
