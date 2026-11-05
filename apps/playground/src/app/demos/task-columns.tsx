import { createColumnHelper } from '@tanstack/react-table';
import type { CellCommitResult } from '@codemancers/sheets';
import {
  SheetEditableTextCell,
  SheetPrimaryCell,
  SheetTextCell,
} from '@codemancers/sheets/ui';
import type { Task } from '../data';

const task = createColumnHelper<Task>();

/** A row being filled in to create a task: its title cell is an editor. */
export type NewTaskRow = {
  id: string;
  onCommit: (title: string) => Promise<CellCommitResult>;
  onCancel: () => void;
};

/** Task columns shared by the sorting, add-row and states demos. */
export function taskColumns(
  onOpen?: (task: Task) => void,
  newRow?: NewTaskRow,
) {
  return [
    task.accessor('title', {
      header: 'Title',
      size: 300,
      cell: ({ row }) =>
        newRow && row.id === newRow.id ? (
          <SheetEditableTextCell
            value=""
            placeholder="New task"
            autoFocus
            onCommit={newRow.onCommit}
            onCancel={newRow.onCancel}
          />
        ) : (
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
