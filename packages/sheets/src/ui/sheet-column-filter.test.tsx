import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { createColumnHelper } from '@tanstack/react-table';
import { textFilter, valuesFilter } from '../hooks/filters.js';
import { useSheet } from '../hooks/use-sheet.js';
import { Sheet } from './sheet.js';

type Task = { id: string; title: string; status: string; owner: string };
const task = createColumnHelper<Task>();
const columns = [
  task.accessor('title', { header: 'Title', filterFn: textFilter }),
  task.accessor('status', { header: 'Status', filterFn: valuesFilter }),
  task.accessor('owner', { header: 'Owner' }),
];
const tasks: Task[] = [
  { id: '1', title: 'Write docs', status: 'Todo', owner: 'Ada' },
  { id: '2', title: 'Fix the docs build', status: 'Done', owner: 'Alan' },
  { id: '3', title: 'Plan the sprint', status: 'Todo', owner: 'Grace' },
];

function Tasks() {
  const sheet = useSheet({ columns, data: tasks, getRowId: (row) => row.id });
  return <Sheet instance={sheet} />;
}

// jsdom has no Popover API, so these stand in for the browser's side of it:
// it reports opening and closing with a toggle event.
function toggle(element: Element, newState: 'open' | 'closed') {
  act(() => {
    element.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
  });
}

beforeAll(() => {
  HTMLElement.prototype.hidePopover = function () {
    toggle(this, 'closed');
  };
});

/** Clicks a header's filter button, as far as jsdom can: opens its panel. */
function openFilter(name: string) {
  const button = screen.getByRole('button', { name });
  const panel = document.getElementById(
    button.getAttribute('popovertarget') ?? '',
  );
  if (!panel) throw new Error(`No panel for ${name}`);
  toggle(panel, 'open');
  return panel;
}

const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('SheetColumnFilter', () => {
  it('gives a filter button only to the columns that opt in', () => {
    render(<Tasks />);

    expect(screen.getByRole('button', { name: 'Filter Title' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter Status' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Filter Owner' })).toBeNull();
  });

  it('filters by the text typed, ignoring case', () => {
    render(<Tasks />);
    openFilter('Filter Title');

    const input = screen.getByRole('textbox', { name: 'Title contains' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'DOCS' } });

    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByText('(filtered)')).toBeTruthy();
  });

  it('closes on Enter, and on Escape without passing it on', () => {
    render(<Tasks />);
    openFilter('Filter Title');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.queryByRole('textbox')).toBeNull();

    openFilter('Filter Title');
    const handled = !fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Escape',
    });

    expect(handled).toBe(true);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('picks values from a checklist with their counts', () => {
    render(<Tasks />);
    openFilter('Filter Status');

    const done = screen.getByRole('checkbox', { name: 'Done 1' });
    expect(document.activeElement).toBe(done);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Todo 2' }));

    expect(bodyRows()).toHaveLength(2);
    fireEvent.click(done);
    expect(bodyRows()).toHaveLength(3);
  });

  it('keeps a picked value listed when other filters hide its rows', () => {
    render(<Tasks />);
    openFilter('Filter Status');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Todo 2' }));
    openFilter('Filter Title');
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'build' },
    });
    openFilter('Filter Status');

    expect(
      screen.getByRole('checkbox', { name: 'Todo 0' }).matches(':checked'),
    ).toBe(true);
    expect(screen.getByRole('checkbox', { name: 'Done 1' })).toBeTruthy();
  });

  it('clears its column and closes', () => {
    render(<Tasks />);
    openFilter('Filter Status');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Todo 2' }));

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(bodyRows()).toHaveLength(3);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
