import { createColumnHelper } from '@tanstack/react-table';
import { SheetPrimaryCell, SheetTextCell } from '@codemancers/sheets/ui';
import type { Task } from '../data';

const task = createColumnHelper<Task>();

/** Read-only task columns shared by the sorting, add-row and states demos. */
export function taskColumns(onOpen?: (task: Task) => void) {
  return [
    task.accessor('title', {
      header: 'Title',
      size: 300,
      cell: ({ row }) => (
        <SheetPrimaryCell
          href={`#task-${row.id}`}
          detailHref={`#task-${row.id}/details`}
          onOpen={onOpen && (() => onOpen(row.original))}
        >
          {row.original.title}
        </SheetPrimaryCell>
      ),
    }),
    task.accessor('status', {
      header: 'Status',
      enableSorting: false,
      cell: ({ getValue }) => <SheetTextCell muted>{getValue()}</SheetTextCell>,
    }),
    // Plain values need no cell renderer.
    task.accessor('owner', { header: 'Owner' }),
    task.accessor('due', { header: 'Due', size: 120 }),
  ];
}
