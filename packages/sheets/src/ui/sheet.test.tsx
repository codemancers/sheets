import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defineSheetColumn } from '../hooks/index.js';
import { useSheet } from '../hooks/use-sheet.js';
import { Sheet } from './sheet.js';

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
        type: 'text',
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
});
