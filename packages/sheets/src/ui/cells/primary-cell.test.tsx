import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SheetPrimaryCell } from './primary-cell.js';
import { SheetCellProvider } from '../../hooks/cell-context.js';
import { useCellStatus } from '../../hooks/use-cell-status.js';
import {
  useRowChanges,
  type RowSubmitResult,
} from '../../hooks/use-row-changes.js';

const renderCell = (onOpen = vi.fn()) => {
  render(
    <div role="row">
      <SheetPrimaryCell
        href="/projects?id=7"
        detailHref="/projects/7"
        onOpen={onOpen}
        openLabel="Open project"
        detailLabel="Open project details page"
      >
        Project Seven
      </SheetPrimaryCell>
    </div>,
  );
  return onOpen;
};

describe('SheetPrimaryCell', () => {
  it('renders the name as a link to href', () => {
    renderCell();
    const link = screen.getByRole('link', { name: 'Project Seven' });
    expect(link.getAttribute('href')).toBe('/projects?id=7');
  });

  it('opens the row on plain click instead of navigating', () => {
    const onOpen = renderCell();
    const link = screen.getByRole('link', { name: 'Project Seven' });
    const navigated = fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(navigated).toBe(false); // preventDefault() was called
  });

  it('lets modified clicks fall through to native navigation', () => {
    const onOpen = renderCell();
    const link = screen.getByRole('link', { name: 'Project Seven' });
    // Runs after the cell's handler. jsdom can't navigate, and logs an error
    // when asked to, so the navigation is cancelled once the cell has let it
    // through.
    let navigated = false;
    const stopNavigation = (event: Event) => {
      navigated = !event.defaultPrevented;
      event.preventDefault();
    };
    window.addEventListener('click', stopNavigation);
    fireEvent.click(link, { metaKey: true });
    window.removeEventListener('click', stopNavigation);
    expect(onOpen).not.toHaveBeenCalled();
    expect(navigated).toBe(true); // default not prevented
  });

  it('opens the row from the panel icon', () => {
    const onOpen = renderCell();
    fireEvent.click(screen.getByRole('button', { name: 'Open project' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('links the detail icon to the full detail page', () => {
    renderCell();
    const detail = screen.getByRole('link', {
      name: 'Open project details page',
    });
    expect(detail.getAttribute('href')).toBe('/projects/7');
  });

  it('omits the detail icon when detailHref is not given (no page of its own)', () => {
    render(
      <div role="row">
        <SheetPrimaryCell
          href="/projects/3?tab=sprints&id=9"
          onOpen={vi.fn()}
          openLabel="Open sprint"
          detailLabel="Open sprint details page"
        >
          Sprint Nine
        </SheetPrimaryCell>
      </div>,
    );
    expect(screen.getByRole('button', { name: 'Open sprint' })).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: 'Open sprint details page' }),
    ).toBeNull();
  });

  it('hides the actions until the row is hovered or focused', () => {
    renderCell();
    const openButton = screen.getByRole('button', {
      name: 'Open project',
    });
    const container = openButton.parentElement;
    expect(container?.className).toContain('opacity-0');
    expect(container?.className).toContain('[[role=row]:hover_&]:opacity-100');
    expect(container?.className).toContain('focus-within:opacity-100');
  });

  it('navigates normally without onOpen', () => {
    render(
      <SheetPrimaryCell href="#project-7">Project Seven</SheetPrimaryCell>,
    );

    const link = screen.getByRole('link', { name: 'Project Seven' });
    // fireEvent.click returns false when the default was prevented.
    expect(fireEvent.click(link)).toBe(true);
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
  });

  it('opens the row from the name when there is no href', () => {
    const onOpen = vi.fn();
    render(<SheetPrimaryCell onOpen={onOpen}>Project Seven</SheetPrimaryCell>);

    fireEvent.click(screen.getByRole('button', { name: 'Project Seven' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders plain text with neither href nor onOpen', () => {
    render(<SheetPrimaryCell>Project Seven</SheetPrimaryCell>);

    expect(screen.getByText('Project Seven').tagName).toBe('SPAN');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('editable', () => {
    const renderEditable = (onCommit = vi.fn(), onOpen = vi.fn()) => {
      render(
        <div role="row">
          <SheetPrimaryCell
            href="/projects?id=7"
            detailHref="/projects/7"
            onOpen={onOpen}
            openLabel="Open project"
            detailLabel="Open project details page"
            editable={{
              value: 'Project Seven',
              onCommit,
              placeholder: 'Enter project name...',
            }}
          >
            Project Seven
          </SheetPrimaryCell>
        </div>,
      );
      return { onCommit, onOpen };
    };

    // The whole point of the mode: a click edits rather than navigates. Rendered
    // as a button, not a link — a link whose click edits would mislead AT users.
    it('starts an in-place edit on plain click, without opening the row', () => {
      const { onOpen } = renderEditable();

      expect(screen.queryByRole('link', { name: 'Project Seven' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Project Seven' }));

      expect(screen.getByDisplayValue('Project Seven')).toBeTruthy();
      expect(onOpen).not.toHaveBeenCalled();
    });

    // Without this the name needs a second click before it can be typed in.
    it('focuses the input as soon as the editor opens', () => {
      renderEditable();

      fireEvent.click(screen.getByRole('button', { name: 'Project Seven' }));

      expect(screen.getByDisplayValue('Project Seven')).toBe(
        document.activeElement,
      );
    });

    it('commits the new name on Enter', () => {
      const { onCommit } = renderEditable();

      fireEvent.click(screen.getByRole('button', { name: 'Project Seven' }));
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value: 'Renamed Seven' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCommit).toHaveBeenCalledWith('Renamed Seven');
    });

    it('restores the name and does not commit on Escape', () => {
      const { onCommit } = renderEditable();

      fireEvent.click(screen.getByRole('button', { name: 'Project Seven' }));
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value: 'Discarded' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onCommit).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'Project Seven' }),
      ).toBeTruthy();
    });

    // Lets the caller drop a standing error when the user starts fixing it.
    it('fires onEditStart when the editor opens', () => {
      const onEditStart = vi.fn();
      render(
        <div role="row">
          <SheetPrimaryCell
            href="/projects?id=7"
            onOpen={vi.fn()}
            editable={{
              value: 'Project Seven',
              onCommit: vi.fn(),
              onEditStart,
            }}
          >
            Project Seven
          </SheetPrimaryCell>
        </div>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Project Seven' }));
      expect(onEditStart).toHaveBeenCalledTimes(1);
    });

    // An empty value means a rejected edit is still on screen; a blank cell
    // would read as broken.
    it('shows the placeholder when the value is empty', () => {
      render(
        <div role="row">
          <SheetPrimaryCell
            href="/projects?id=7"
            onOpen={vi.fn()}
            editable={{
              value: '',
              onCommit: vi.fn(),
              placeholder: 'Enter project name...',
            }}
          >
            {''}
          </SheetPrimaryCell>
        </div>,
      );

      expect(
        screen.getByRole('button', { name: 'Enter project name...' }),
      ).toBeTruthy();
    });

    // Reassigning the name's click is only acceptable because both destinations
    // stay reachable on the icons.
    it('keeps both navigation affordances on the icons', () => {
      const { onOpen } = renderEditable();

      fireEvent.click(screen.getByRole('button', { name: 'Open project' }));
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(
        screen
          .getByRole('link', { name: 'Open project details page' })
          .getAttribute('href'),
      ).toBe('/projects/7');
    });
  });

  // Inside a Sheet the cell reports on itself, so a consumer wires a schema and
  // nothing else. This harness stands in for that scope.
  describe('inside a Sheet', () => {
    const nameSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'test',
        validate: (value: unknown) =>
          typeof value === 'string' && value.length > 0
            ? { value }
            : { issues: [{ message: 'Project name is required' }] },
      },
    };

    function Harness({ onCommit }: { onCommit: (v: string) => void }) {
      const cellStatus = useCellStatus();
      const refused = cellStatus.rejectedCellValue('7', 'name');
      return (
        <div role="row">
          <SheetCellProvider
            value={{ rowId: '7', columnId: 'name', cellStatus }}
          >
            <SheetPrimaryCell
              href="/projects?id=7"
              onOpen={vi.fn()}
              editable={{
                value: 'Project Seven',
                onCommit,
                schema: nameSchema,
                placeholder: 'Enter project name...',
              }}
            >
              {String(refused ?? 'Project Seven')}
            </SheetPrimaryCell>
          </SheetCellProvider>
          <output data-testid="status">
            {JSON.stringify(cellStatus.statuses)}
          </output>
        </div>
      );
    }

    const open = () =>
      fireEvent.click(screen.getByRole('button', { name: /Project Seven/ }));

    it('blocks a commit that fails the column schema', () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit} />);

      open();
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCommit).not.toHaveBeenCalled();
      // Reported on this cell, with the schema's own wording.
      expect(screen.getByTestId('status').textContent).toContain(
        'Project name is required',
      );
    });

    it('commits a value that passes', () => {
      const onCommit = vi.fn();
      render(<Harness onCommit={onCommit} />);

      open();
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value: 'Renamed Seven' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onCommit).toHaveBeenCalledWith('Renamed Seven');
      expect(screen.getByTestId('status').textContent).toBe('{}');
    });

    it('keeps the refused value on screen and reopens the editor with it', () => {
      render(<Harness onCommit={vi.fn()} />);

      open();
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Empty refused value shows the placeholder, not a blank cell.
      const placeholder = screen.getByRole('button', {
        name: 'Enter project name...',
      });
      fireEvent.click(placeholder);

      // Reopening drops the icon but keeps the refused text as the seed.
      expect(screen.getByTestId('status').textContent).toBe('{}');
      expect(screen.getByRole('textbox')).toHaveProperty('value', '');
    });

    it('restores the stored value when the edit is abandoned', () => {
      render(<Harness onCommit={vi.fn()} />);

      open();
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      fireEvent.click(
        screen.getByRole('button', { name: 'Enter project name...' }),
      );
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

      expect(
        screen.getByRole('button', { name: 'Project Seven' }),
      ).toBeTruthy();
      expect(screen.getByTestId('status').textContent).toBe('{}');
    });
  });

  // When the Sheet stages writes, the column's schema has to gate the buffer,
  // not just the request: a value that reaches the buffer will be flushed, so
  // validating after staging would send exactly what the schema rejected.
  describe('staged submission', () => {
    const nameSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'test',
        validate: (value: unknown) =>
          typeof value === 'string' && value.length > 0
            ? { value }
            : { issues: [{ message: 'Project name is required' }] },
      },
    };

    function StagedHarness({
      onSubmitRow,
    }: {
      onSubmitRow: (
        rowId: string,
        changes: Record<string, unknown>,
      ) => RowSubmitResult | Promise<RowSubmitResult>;
    }) {
      const cellStatus = useCellStatus();
      const rowChanges = useRowChanges({
        cellStatus,
        onSubmitRow,
        flush: 'immediate',
      });
      return (
        <div role="row">
          <SheetCellProvider
            value={{
              rowId: '7',
              columnId: 'name',
              cellStatus,
              rowChanges,
            }}
          >
            <SheetPrimaryCell
              href="/projects?id=7"
              onOpen={vi.fn()}
              editable={{
                value: 'Project Seven',
                schema: nameSchema,
                placeholder: 'Enter project name...',
              }}
            >
              Project Seven
            </SheetPrimaryCell>
          </SheetCellProvider>
          <output data-testid="status">
            {JSON.stringify(cellStatus.statuses)}
          </output>
        </div>
      );
    }

    const editTo = (value: string) => {
      fireEvent.click(screen.getByRole('button', { name: /Project Seven/ }));
      const input = screen.getByDisplayValue('Project Seven');
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: 'Enter' });
    };

    it('never stages a value the column schema rejects', async () => {
      const onSubmitRow = vi.fn();
      render(<StagedHarness onSubmitRow={onSubmitRow} />);

      editTo('');

      await waitFor(() =>
        expect(screen.getByTestId('status').textContent).toContain(
          'Project name is required',
        ),
      );
      expect(onSubmitRow).not.toHaveBeenCalled();
    });

    const refused = {
      error: 'Name taken',
      fieldErrors: { name: ['Name taken'] },
    };

    it('re-sends a refused value committed unchanged', async () => {
      const onSubmitRow = vi
        .fn()
        .mockResolvedValueOnce(refused)
        .mockResolvedValueOnce(undefined);
      render(<StagedHarness onSubmitRow={onSubmitRow} />);

      editTo('Taken');
      await waitFor(() =>
        expect(screen.getByTestId('status').textContent).toContain(
          'Name taken',
        ),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Taken' }));
      fireEvent.keyDown(screen.getByDisplayValue('Taken'), { key: 'Enter' });

      await waitFor(() => expect(onSubmitRow).toHaveBeenCalledTimes(2));
      expect(onSubmitRow).toHaveBeenLastCalledWith('7', { name: 'Taken' });
    });

    it('drops a refused value when the edit goes back to the saved one', async () => {
      const onSubmitRow = vi.fn().mockResolvedValue(refused);
      render(<StagedHarness onSubmitRow={onSubmitRow} />);

      editTo('Taken');
      await waitFor(() =>
        expect(screen.getByTestId('status').textContent).toContain(
          'Name taken',
        ),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Taken' }));
      const input = screen.getByDisplayValue('Taken');
      fireEvent.change(input, { target: { value: 'Project Seven' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSubmitRow).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole('button', { name: 'Project Seven' }),
      ).toBeTruthy();
      expect(screen.getByTestId('status').textContent).toBe('{}');
    });

    it('submits a value that passes, without a per-cell onCommit', async () => {
      const onSubmitRow = vi.fn();
      render(<StagedHarness onSubmitRow={onSubmitRow} />);

      editTo('Renamed Seven');

      await waitFor(() =>
        expect(onSubmitRow).toHaveBeenCalledWith('7', {
          name: 'Renamed Seven',
        }),
      );
    });
  });
});
