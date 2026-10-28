import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SheetEditableTextCell } from './editable-text-cell.js';
import { SheetCellProvider } from '../../hooks/cell-context.js';
import { useCellStatus } from '../../hooks/use-cell-status.js';

const renderCell = (
  props: Partial<React.ComponentProps<typeof SheetEditableTextCell>> = {},
) => {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  render(
    <SheetEditableTextCell
      value="Project One"
      onCommit={onCommit}
      onCancel={onCancel}
      autoFocus
      {...props}
    />,
  );
  return { onCommit, onCancel };
};

describe('SheetEditableTextCell', () => {
  it('commits a changed value on Enter', () => {
    const { onCommit } = renderCell();

    const input = screen.getByDisplayValue('Project One');
    fireEvent.change(input, { target: { value: 'Renamed One' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('Renamed One');
  });

  // Callers must not rely on onCommit to learn that editing ended.
  it('does not call onCommit when the value is unchanged', () => {
    const { onCommit } = renderCell();

    fireEvent.keyDown(screen.getByDisplayValue('Project One'), {
      key: 'Enter',
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('discards the draft on Escape', () => {
    const { onCommit, onCancel } = renderCell();

    const input = screen.getByDisplayValue('Project One');
    fireEvent.change(input, { target: { value: 'Discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').textContent).toBe('Project One');
  });

  it('commits on blur, and only once', () => {
    const { onCommit } = renderCell();

    const input = screen.getByDisplayValue('Project One');
    fireEvent.change(input, { target: { value: 'Renamed One' } });
    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  // The rule lives with the column and this cell executes it, same contract as
  // SheetPrimaryCell. Reporting needs a Sheet, so the scope is provided here.
  describe('schema', () => {
    const required = {
      safeParse: (value: unknown) =>
        typeof value === 'string' && value.length > 0
          ? ({ success: true } as const)
          : ({
              success: false,
              error: { issues: [{ message: 'Title is required' }] },
            } as const),
    };

    function Harness({ onCommit }: { onCommit: (v: string) => void }) {
      const cellStatus = useCellStatus();
      return (
        <div role="row">
          <SheetCellProvider
            value={{ rowId: '7', columnId: 'title', cellStatus }}
          >
            <SheetEditableTextCell
              value="Task Seven"
              onCommit={onCommit}
              schema={required}
              placeholder="Enter a title..."
            />
          </SheetCellProvider>
          <output data-testid="status">
            {JSON.stringify(cellStatus.statuses)}
          </output>
        </div>
      );
    }

    const editTo = (next: string) => {
      fireEvent.click(screen.getByRole('button', { name: /Task Seven/ }));
      const input = screen.getByDisplayValue('Task Seven');
      fireEvent.change(input, { target: { value: next } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    it('blocks a commit that fails the rule and reports it on this cell', () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit} />);

      editTo('');

      expect(onCommit).not.toHaveBeenCalled();
      expect(screen.getByTestId('status').textContent).toContain(
        'Title is required',
      );
    });

    it('commits a value that passes', () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit} />);

      editTo('Renamed Seven');

      expect(onCommit).toHaveBeenCalledWith('Renamed Seven');
      expect(screen.getByTestId('status').textContent).toBe('{}');
    });

    // Same lifetimes as the primary cell: the icon goes when they reopen, the
    // refused text stays so a typo is fixed rather than retyped.
    it('keeps the refused value and clears the icon on reopen', () => {
      render(<Harness onCommit={vi.fn()} />);

      editTo('');
      fireEvent.click(screen.getByRole('button', { name: 'Enter a title...' }));

      expect(screen.getByTestId('status').textContent).toBe('{}');
      expect(screen.getByRole('textbox')).toHaveProperty('value', '');
    });

    // Outside a Sheet there is nowhere to report to, so silently swallowing the
    // commit would lose the edit with nothing on screen to explain it.
    it('passes the value through when rendered with no Sheet scope', () => {
      const onCommit = vi.fn();
      render(
        <SheetEditableTextCell
          value="Task Seven"
          onCommit={onCommit}
          schema={required}
          autoFocus
        />,
      );

      const input = screen.getByDisplayValue('Task Seven');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCommit).toHaveBeenCalledWith('');
    });
  });
});
