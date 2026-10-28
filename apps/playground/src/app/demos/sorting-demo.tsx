import { useMemo, useState } from 'react';
import { useSheet, type SortingState } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { makeTasks, sortTasks } from '../data';
import { taskColumns } from './task-columns';

const TASKS = makeTasks(10);

export function SortingDemo() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [opened, setOpened] = useState<string>();
  const data = useMemo(() => sortTasks(TASKS, sorting), [sorting]);
  const columns = useMemo(
    () => taskColumns((task) => setOpened(task.title)),
    [],
  );
  const sheet = useSheet({
    columns,
    data,
    getRowId: (task) => task.id,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Sheet instance={sheet} />
      </div>
      <p
        role="status"
        className="border-t border-zinc-950/10 px-3 py-2 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400"
      >
        {opened ? `Opened drawer for “${opened}”` : 'No drawer open'}
      </p>
    </div>
  );
}
