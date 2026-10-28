import { useContext } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { RtlContext } from '../direction';
import { makeTasks, type Task } from '../data';

const TASKS = makeTasks(1000);
const task = createColumnHelper<Task>();

// Group headers, and a header that renders markup instead of a string.
const columns = [
  task.group({
    id: 'task',
    header: 'Task',
    columns: [
      task.accessor('title', { header: 'Title', size: 300 }),
      task.accessor('status', { header: 'Status' }),
    ],
  }),
  task.group({
    id: 'assignment',
    header: 'Assignment',
    columns: [
      task.accessor('owner', { header: 'Owner' }),
      task.accessor('due', {
        header: () => <abbr title="Due date">Due</abbr>,
        size: 120,
      }),
    ],
  }),
];

/** Sorted in the browser, the default. No virtualization yet. */
export function LargeDemo() {
  const rtl = useContext(RtlContext);
  const sheet = useSheet({
    columnResizeDirection: rtl ? 'rtl' : 'ltr',
    columns,
    data: TASKS,
    getRowId: (task) => task.id,
  });
  return <Sheet instance={sheet} />;
}
