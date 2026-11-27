import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import { useSheet, type SheetFeatures } from '../hooks/use-sheet.js';
import { Sheet } from './sheet.js';

type Row = { id: string; a: string; b: string; c: string };
const col = createColumnHelper<SheetFeatures, Row>();
const columns = col.columns([
  col.accessor('a', { header: 'A' }),
  col.accessor('b', { header: 'B' }),
  col.accessor('c', { header: 'C' }),
]);
const data = [{ id: '1', a: 'a1', b: 'b1', c: 'c1' }];

function Grid({
  enableColumnOrdering = true,
  fixed,
}: {
  enableColumnOrdering?: boolean;
  fixed?: boolean;
}) {
  const sheet = useSheet({
    columns: fixed
      ? col.columns([
          col.accessor('a', {
            header: 'A',
            meta: { enableColumnOrdering: false },
          }),
          col.accessor('b', { header: 'B' }),
          col.accessor('c', { header: 'C' }),
        ])
      : columns,
    data,
    getRowId: (row) => row.id,
  });
  return <Sheet instance={sheet} enableColumnOrdering={enableColumnOrdering} />;
}

// jsdom has no Popover API: these stand in for the browser's toggle events.
function toggle(element: Element, newState: 'open' | 'closed') {
  act(() => {
    element.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
  });
}

beforeAll(() => {
  HTMLElement.prototype.hidePopover = function () {
    toggle(this, 'closed');
  };
  // Nor DragEvent, so drag events would lose their pointer position. In
  // browsers it's a MouseEvent.
  if (!('DragEvent' in window))
    Object.assign(window, { DragEvent: class extends MouseEvent {} });
});

afterEach(() => {
  vi.useRealTimers();
});

function openMenu(name: string) {
  const handle = screen.getByRole('button', { name });
  const panel = document.getElementById(
    handle.getAttribute('popovertarget') ?? '',
  );
  if (!panel) throw new Error(`No menu for ${name}`);
  toggle(panel, 'open');
  return handle;
}

const headers = () =>
  screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent)
    .filter((text) => text && text !== 'Row');
const cells = () => screen.getAllByRole('cell').map((cell) => cell.textContent);

describe('moving columns', () => {
  it('shows no handles unless asked', () => {
    render(<Grid enableColumnOrdering={false} />);
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
  });

  it('gives each movable column a handle, but not a fixed one', () => {
    render(<Grid fixed />);
    expect(screen.queryByRole('button', { name: 'Move A' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Move B' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move C' })).toBeTruthy();
  });

  it('moves a column from its menu, keeping focus on the handle', () => {
    vi.useFakeTimers();
    render(<Grid />);
    const handle = openMenu('Move A');

    const left = screen.getByRole('button', { name: 'Move left' });
    const right = screen.getByRole('button', { name: 'Move right' });
    expect((left as HTMLButtonElement).disabled).toBe(true);
    expect(document.activeElement).toBe(right);
    fireEvent.click(right);

    expect(headers()).toEqual(['B', 'A', 'C']);
    expect(cells()).toEqual(['b1', 'a1', 'c1']);
    expect(screen.queryByRole('button', { name: 'Move right' })).toBeNull();
    expect(document.activeElement).toBe(handle);

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(status.textContent).toBe('A moved to column 2 of 3');
  });

  describe('dragging', () => {
    const transfer = () => ({
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: '',
      dropEffect: '',
    });
    // jsdom lays nothing out: each header is 100px wide from 0.
    const header = (name: string) => {
      const cell = screen
        .getAllByRole('columnheader')
        .find((h) => h.textContent === name);
      if (!cell) throw new Error(`No header ${name}`);
      cell.getBoundingClientRect = () =>
        ({ left: 0, width: 100, top: 0, height: 30 }) as DOMRect;
      return cell;
    };
    const drag = (handle: HTMLElement, target: HTMLElement, x: number) => {
      const dataTransfer = transfer();
      fireEvent.dragStart(handle, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer, clientX: x });
      fireEvent.drop(target, { dataTransfer, clientX: x });
      fireEvent.dragEnd(handle, { dataTransfer });
      return dataTransfer;
    };

    it('lands before or after the header, by the half it is dropped on', () => {
      render(<Grid />);

      const dataTransfer = drag(
        screen.getByRole('button', { name: 'Move A' }),
        header('C'),
        75,
      );
      expect(headers()).toEqual(['B', 'C', 'A']);
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'A');

      drag(screen.getByRole('button', { name: 'Move A' }), header('B'), 25);
      expect(headers()).toEqual(['A', 'B', 'C']);
    });

    it('drops a column outside a group on the group header', () => {
      function Grouped() {
        const sheet = useSheet({
          columns: col.columns([
            col.group({
              id: 'g',
              header: 'G',
              columns: col.columns([
                col.accessor('a', { header: 'A' }),
                col.accessor('b', { header: 'B' }),
              ]),
            }),
            col.accessor('c', { header: 'C' }),
          ]),
          data,
          getRowId: (row) => row.id,
        });
        return <Sheet instance={sheet} enableColumnOrdering />;
      }
      render(<Grouped />);
      expect(headers()).toEqual(['G', 'A', 'B', 'C']);

      drag(screen.getByRole('button', { name: 'Move C' }), header('G'), 25);

      expect(headers()).toEqual(['G', 'C', 'A', 'B']);
    });

    it('starts no drag while a column is resized', () => {
      render(<Grid />);
      fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize A' }), {
        clientX: 100,
      });

      const started = fireEvent.dragStart(
        screen.getByRole('button', { name: 'Move A' }),
        { dataTransfer: transfer() },
      );

      expect(started).toBe(false);
      fireEvent.mouseUp(document, { clientX: 100 });
    });

    it('refuses a column dragged from another sheet', () => {
      render(
        <>
          <Grid />
          <Grid />
        </>,
      );
      const [handle] = screen.getAllByRole('button', { name: 'Move A' });
      const otherC = screen
        .getAllByRole('columnheader')
        .filter((h) => h.textContent === 'C')[1];
      otherC.getBoundingClientRect = () =>
        ({ left: 0, width: 100, top: 0, height: 30 }) as DOMRect;

      drag(handle, otherC, 75);
      expect(headers()).toEqual(['A', 'B', 'C', 'A', 'B', 'C']);
    });
  });
});
