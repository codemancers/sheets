import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetActionsCell } from './actions-cell.js';

describe('SheetActionsCell', () => {
  it('shows the actions it is given', () => {
    render(
      <SheetActionsCell>
        <button type="button">Edit</button>
        <button type="button">Delete</button>
      </SheetActionsCell>,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });
});
