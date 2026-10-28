import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SheetCell } from './sheet-cell.js';

const message = 'A project with this name already exists in your workspace.';

describe('SheetCell', () => {
  it('renders its content with no status affordances by default', () => {
    render(<SheetCell>Sprite Demo</SheetCell>);

    expect(screen.getByRole('cell').textContent).toBe('Sprite Demo');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  describe('error', () => {
    it('keeps showing the value and adds an icon labelled with the message', () => {
      render(
        <SheetCell status={{ kind: 'error', message }}>Sprite Demo</SheetCell>,
      );

      expect(screen.getByRole('cell').textContent).toContain('Sprite Demo');
      expect(screen.getByRole('button', { name: message })).toBeTruthy();
    });

    it('announces the message once, so it is not silent for screen readers', () => {
      render(
        <SheetCell status={{ kind: 'error', message }}>Sprite Demo</SheetCell>,
      );

      expect(screen.getByRole('alert').textContent).toBe(message);
    });

    // No ring or fill: tinting whole cells turns a grid with a few bad values
    // into a wall of red.
    it('does not tint or ring the cell', () => {
      render(
        <SheetCell status={{ kind: 'error', message }}>Sprite Demo</SheetCell>,
      );

      const cell = screen.getByRole('cell');
      expect(cell.className).not.toContain('ring-red');
      expect(cell.className).not.toContain('bg-red');
    });

    it('stops clipping, so the popover is not cut off', () => {
      render(
        <SheetCell status={{ kind: 'error', message }}>Sprite Demo</SheetCell>,
      );

      const cell = screen.getByRole('cell');
      expect(cell.className).toContain('overflow-visible');
      expect(cell.className).not.toContain('overflow-hidden');
    });
  });

  describe('saved', () => {
    it('renders an announced tick', () => {
      render(<SheetCell status={{ kind: 'saved' }}>Sprite Demo</SheetCell>);

      expect(screen.getByRole('status').textContent).toBe('Saved');
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  it('clips again once the status clears', () => {
    const { rerender } = render(
      <SheetCell status={{ kind: 'error', message }}>Sprite Demo</SheetCell>,
    );
    rerender(<SheetCell>Sprite Demo</SheetCell>);

    expect(screen.getByRole('cell').className).toContain('overflow-hidden');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
