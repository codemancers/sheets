import { describe, it, expect, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { CellCommitResult } from '../../hooks/types.js';
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
  // Nothing to save ends the edit the way Escape does, so a new row that was
  // never filled in can go away.
  it('calls onCancel, not onCommit, when Enter leaves the value unchanged', () => {
    const { onCommit, onCancel } = renderCell();

    fireEvent.keyDown(screen.getByDisplayValue('Project One'), {
      key: 'Enter',
    });

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel, not onCommit, when focus leaves an unchanged value', () => {
    const { onCommit, onCancel } = renderCell();

    fireEvent.blur(screen.getByDisplayValue('Project One'));

    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
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
  // Data entry, as in a spreadsheet: a focused cell opens on the key typed.
  describe('typing into the cell', () => {
    const cell = () => screen.getByRole('button', { name: 'Project One' });
    const editor = () => screen.queryByRole<HTMLInputElement>('textbox');

    it('opens on a typed character, which replaces the value', () => {
      const { onCommit } = renderCell({ autoFocus: false });

      fireEvent.keyDown(cell(), { key: 'R' });

      expect(editor()?.value).toBe('R');
      expect(document.activeElement).toBe(editor());
      fireEvent.keyDown(editor() as HTMLInputElement, { key: 'Enter' });
      expect(onCommit).toHaveBeenCalledWith('R');
    });

    it('keeps the value on F2', () => {
      renderCell({ autoFocus: false });

      fireEvent.keyDown(cell(), { key: 'F2' });

      expect(editor()?.value).toBe('Project One');
    });

    // Space presses the button, which opens the editor with the value kept.
    it('does not take Space as a typed character', () => {
      renderCell({ autoFocus: false });

      fireEvent.keyDown(cell(), { key: ' ' });

      expect(editor()).toBeNull();
    });

    it('leaves shortcuts alone, but types AltGr characters', () => {
      renderCell({ autoFocus: false });

      fireEvent.keyDown(cell(), { key: 'c', ctrlKey: true });
      fireEvent.keyDown(cell(), { key: 'v', metaKey: true });
      expect(editor()).toBeNull();

      fireEvent.keyDown(cell(), { key: '@', ctrlKey: true, altKey: true });
      expect(editor()?.value).toBe('@');
    });

    it('leaves the key to an input method that is composing', () => {
      renderCell({ autoFocus: false });

      fireEvent.keyDown(cell(), { key: 'a', isComposing: true });

      expect(editor()).toBeNull();
    });
  });

  describe('schema', () => {
    const required = {
      '~standard': {
        version: 1 as const,
        vendor: 'test',
        validate: (value: unknown) =>
          typeof value === 'string' && value.length > 0
            ? { value }
            : { issues: [{ message: 'Title is required' }] },
      },
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

    // Standard Schema validators may answer asynchronously.
    it('waits for an async rule before committing', async () => {
      const onCommit = vi.fn();
      const checkedLater = {
        '~standard': {
          version: 1 as const,
          vendor: 'test',
          validate: async (value: unknown) =>
            value === 'Approved'
              ? { value }
              : { issues: [{ message: 'Not approved' }] },
        },
      };
      function AsyncHarness() {
        const cellStatus = useCellStatus();
        return (
          <div role="row">
            <SheetCellProvider
              value={{ rowId: '7', columnId: 'title', cellStatus }}
            >
              <SheetEditableTextCell
                value="Task Seven"
                onCommit={onCommit}
                schema={checkedLater}
              />
            </SheetCellProvider>
            <output data-testid="status">
              {JSON.stringify(cellStatus.statuses)}
            </output>
          </div>
        );
      }
      render(<AsyncHarness />);

      editTo('Rejected');
      await waitFor(() =>
        expect(screen.getByTestId('status').textContent).toContain(
          'Not approved',
        ),
      );
      expect(onCommit).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Rejected' }));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Approved' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(onCommit).toHaveBeenCalledWith('Approved'));
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

  // What onCommit reports back, shown on the cell the way a refused value is.
  describe('commit results', () => {
    function ResultHarness({
      value = 'Task Seven',
      onCommit,
      onCancel,
    }: {
      value?: string;
      onCommit: (next: string) => CellCommitResult | Promise<CellCommitResult>;
      onCancel?: () => void;
    }) {
      const cellStatus = useCellStatus();
      return (
        <div role="row">
          <SheetCellProvider
            value={{ rowId: '7', columnId: 'title', cellStatus }}
          >
            <SheetEditableTextCell
              value={value}
              onCommit={onCommit}
              onCancel={onCancel}
              placeholder="New task"
            />
          </SheetCellProvider>
          <output data-testid="status">
            {JSON.stringify(cellStatus.statuses)}
          </output>
        </div>
      );
    }

    const editTo = (opener: string, next: string) => {
      fireEvent.click(screen.getByRole('button', { name: opener }));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: next } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    it('shows the error onCommit returns, keeping the typed value', async () => {
      render(
        <ResultHarness
          onCommit={async () => ({ error: 'That name is taken' })}
        />,
      );

      editTo('Task Seven', 'Taken');

      await waitFor(() =>
        expect(screen.getByTestId('status').textContent).toContain(
          'That name is taken',
        ),
      );
      expect(screen.getByRole('button', { name: 'Taken' })).toBeTruthy();
    });

    it('shows the save-failed message when onCommit throws', async () => {
      render(
        <ResultHarness
          onCommit={async () => {
            throw new Error('offline');
          }}
        />,
      );

      editTo('Task Seven', 'Renamed Seven');

      await waitFor(() =>
        expect(screen.getByTestId('status').textContent).toContain(
          'Could not save. Check your connection.',
        ),
      );
      expect(
        screen.getByRole('button', { name: 'Renamed Seven' }),
      ).toBeTruthy();
    });

    // Otherwise the cell flashes back to the old value, or to the placeholder
    // on a new row, until the app's data catches up.
    it('keeps the typed value on screen while onCommit runs', async () => {
      let finish: (() => void) | undefined;
      render(
        <ResultHarness
          onCommit={() =>
            new Promise<void>((resolve) => {
              finish = resolve;
            })
          }
        />,
      );

      editTo('Task Seven', 'Renamed Seven');
      expect(
        screen.getByRole('button', { name: 'Renamed Seven' }),
      ).toBeTruthy();

      await act(async () => finish?.());
      expect(screen.getByRole('button', { name: 'Task Seven' })).toBeTruthy();
    });

    it('retries a refused value committed again unchanged', async () => {
      const onCommit = vi
        .fn<(next: string) => Promise<CellCommitResult>>()
        .mockResolvedValueOnce({ error: 'That name is taken' })
        .mockResolvedValueOnce(undefined);
      render(<ResultHarness onCommit={onCommit} />);

      editTo('Task Seven', 'Taken');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Taken' })).toBeTruthy(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Taken' }));
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(2));
      expect(onCommit).toHaveBeenLastCalledWith('Taken');
    });

    describe('on a new row', () => {
      it('ends with onCancel when left empty', () => {
        const onCommit = vi.fn();
        const onCancel = vi.fn();
        render(
          <ResultHarness value="" onCommit={onCommit} onCancel={onCancel} />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'New task' }));
        fireEvent.blur(screen.getByRole('textbox'));

        expect(onCommit).not.toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalledTimes(1);
      });

      it('ends with onCancel when a refused name is cleared', async () => {
        const onCancel = vi.fn();
        render(
          <ResultHarness
            value=""
            onCommit={async () => ({ error: 'That name is taken' })}
            onCancel={onCancel}
          />,
        );

        editTo('New task', 'Taken');
        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Taken' })).toBeTruthy(),
        );
        editTo('Taken', '');

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('status').textContent).toBe('{}');
      });
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
      onSubmitRow: (rowId: string, changes: Record<string, unknown>) => void;
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
