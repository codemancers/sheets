import { useMemo } from 'react';
import { getSortedRowModel, useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { makeTasks } from '../data';
import { taskColumns } from './task-columns';

const TASKS = makeTasks(1000);

/** Sorted in the browser. No virtualization yet: every row is in the DOM. */
export function LargeDemo() {
  const columns = useMemo(() => taskColumns(), []);
  const sheet = useSheet({
    columns,
    data: TASKS,
    getRowId: (task) => task.id,
    tableOptions: {
      manualSorting: false,
      getSortedRowModel: getSortedRowModel(),
    },
  });
  return <Sheet instance={sheet} />;
}
