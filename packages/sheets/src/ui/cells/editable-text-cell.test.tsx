import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SheetEditableTextCell } from './editable-text-cell.js';
import { SheetCellProvider } from '../../hooks/cell-context.js';
import { useCellStatus } from '../../hooks/use-cell-status.js';
import { useRowChanges } from '../../hooks/use-row-changes.js';

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

  // Japanese, Chinese and Korean input confirm a composition with Enter.
  it('ignores Enter while an IME composition is in progress', () => {
    const { onCommit } = renderCell();

    const input = screen.getByDisplayValue('Project One');
    fireEvent.change(input, { target: { value: 'プロジェクト' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    // Safari reports the confirming keydown as keyCode 229 instead.
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('プロジェクト')).toBeTruthy();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('プロジェクト');
  });

  it('focuses the editor as soon as it opens', () => {
    render(<SheetEditableTextCell value="Project One" />);

    fireEvent.click(screen.getByRole('button', { name: 'Project One' }));

    expect(document.activeElement).toBe(screen.getByRole('textbox'));
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

    // Confirming the refused text unchanged is a retry, not a no-op that
    // closes the editor as if the value had been saved.
    it('checks a refused value again when it is committed unchanged', () => {
      render(<Harness onCommit={vi.fn()} />);

      editTo('');
      fireEvent.click(screen.getByRole('button', { name: 'Enter a title...' }));
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(screen.getByTestId('status').textContent).toContain(
        'Title is required',
      );
    });

    it('drops a refused value when the edit goes back to the saved one', () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit} />);

      editTo('');
      fireEvent.click(screen.getByRole('button', { name: 'Enter a title...' }));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Task Seven' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCommit).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Task Seven' })).toBeTruthy();
      expect(screen.getByTestId('status').textContent).toBe('{}');
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

  describe('staged submission', () => {
    function StagedHarness({
      stage,
      onCommit,
      onSubmitRow,
    }: {
      stage?: boolean;
      onCommit: (next: string) => void;
      onSubmitRow: (rowId: string, changes: Record<string, string>) => void;
    }) {
      const cellStatus = useCellStatus();
      const rowChanges = useRowChanges({ cellStatus, onSubmitRow });
      return (
        <div role="row">
          <SheetCellProvider
            value={{ rowId: '7', columnId: 'title', cellStatus, rowChanges }}
          >
            <SheetEditableTextCell
              value="Task Seven"
              stage={stage}
              onCommit={onCommit}
            />
          </SheetCellProvider>
        </div>
      );
    }

    const editTo = (next: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Task Seven' }));
      const input = screen.getByDisplayValue('Task Seven');
      fireEvent.change(input, { target: { value: next } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    it('hands the value to the row buffer when asked to stage', async () => {
      const onCommit = vi.fn();
      const onSubmitRow = vi.fn();
      render(
        <StagedHarness stage onCommit={onCommit} onSubmitRow={onSubmitRow} />,
      );

      editTo('Renamed Seven');

      await waitFor(() =>
        expect(onSubmitRow).toHaveBeenCalledWith('7', {
          title: 'Renamed Seven',
        }),
      );
      expect(onCommit).not.toHaveBeenCalled();
    });

    // The default: a commit can mean create, which must not patch a row.
    it('calls onCommit and leaves the row buffer alone by default', () => {
      const onCommit = vi.fn();
      const onSubmitRow = vi.fn();
      render(<StagedHarness onCommit={onCommit} onSubmitRow={onSubmitRow} />);

      editTo('Renamed Seven');

      expect(onCommit).toHaveBeenCalledWith('Renamed Seven');
      expect(onSubmitRow).not.toHaveBeenCalled();
    });
  });
});
