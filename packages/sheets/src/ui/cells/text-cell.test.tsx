import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetTextCell } from './text-cell.js';

describe('SheetTextCell', () => {
  it('shows its text', () => {
    render(<SheetTextCell>Project Seven</SheetTextCell>);
    expect(screen.getByText('Project Seven')).toBeTruthy();
  });

  it('uses the muted colour when muted', () => {
    render(<SheetTextCell muted>Archived</SheetTextCell>);
    expect(screen.getByText('Archived').className).toContain(
      'text-sheet-muted',
    );
  });
});
