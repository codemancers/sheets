import { useContext, useMemo, useState } from 'react';
import type { SortingState } from '@tanstack/react-table';
import { useRowDrawer, useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { RtlContext } from '../direction';
import { makeTasks, sortTasks } from '../data';
import { taskColumns } from './task-columns';
import { TaskDrawer } from './task-drawer';

const TASKS = makeTasks(10);

/**
 * Server-side sorting: the sheet reports the sort, the app applies it. Rows
 * open in a drawer through useRowDrawer.
 */
export function SortingDemo() {
  const rtl = useContext(RtlContext);
  const [sorting, setSorting] = useState<SortingState>([]);
  const drawer = useRowDrawer();
  const data = useMemo(() => sortTasks(TASKS, sorting), [sorting]);
  // open keeps one identity, so the columns are built once.
  const { open } = drawer;
  const columns = useMemo(() => taskColumns((task) => open(task.id)), [open]);
  const sheet = useSheet({
    columnResizeDirection: rtl ? 'rtl' : 'ltr',
    columns,
    data,
    getRowId: (task) => task.id,
    manualSorting: true,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <>
      <Sheet
        instance={sheet}
        openRowId={drawer.openRowId}
        enableColumnOrdering
      />
      <TaskDrawer
        task={TASKS.find((task) => task.id === drawer.openRowId)}
        onClose={drawer.close}
      />
    </>
  );
}
