import { useMemo } from 'react';
import { useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { makeTasks } from '../data';
import { taskColumns } from './task-columns';

const TASKS = makeTasks(1000);

/** No virtualization yet: every row is in the DOM. */
export function LargeDemo() {
  const columns = useMemo(() => taskColumns(() => undefined), []);
  const sheet = useSheet({ columns, data: TASKS, getRowId: (task) => task.id });
  return <Sheet instance={sheet} />;
}
