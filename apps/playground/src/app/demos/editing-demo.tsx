import { useState, useContext } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import {
  useCellStatus,
  useRowChanges,
  useSheet,
  type SheetFeatures,
} from '@codemancers/sheets';
import {
  Sheet,
  SheetEditableTextCell,
  SheetPrimaryCell,
  SheetTextCell,
} from '@codemancers/sheets/ui';
import { makeTasks, requiredTitle, saveTask, type Task } from '../data';
import { RtlContext } from '../direction';

const task = createColumnHelper<SheetFeatures, Task>();

const columns = task.columns([
  task.accessor('title', {
    header: 'Title',
    size: 320,
    cell: ({ row }) => (
      <SheetPrimaryCell
        editable={{
          value: row.original.title,
          schema: requiredTitle,
          placeholder: 'Untitled',
        }}
      >
        {row.original.title}
      </SheetPrimaryCell>
    ),
  }),
  task.accessor('owner', {
    header: 'Owner',
    size: 220,
    cell: ({ row }) => (
      <SheetEditableTextCell
        value={row.original.owner}
        placeholder="Unassigned"
        stage
      />
    ),
  }),
  task.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <SheetTextCell muted>{getValue()}</SheetTextCell>,
  }),
]);

export function EditingDemo() {
  const rtl = useContext(RtlContext);
  const [tasks, setTasks] = useState(() => makeTasks(6));
  const cellStatus = useCellStatus();
  const rowChanges = useRowChanges({
    cellStatus,
    flush: { debounce: 600 },
    onSubmitRow: async (rowId, changes) => {
      const result = await saveTask(changes);
      if (!result) {
        setTasks((current) =>
          current.map((task) =>
            task.id === rowId
              ? { ...task, ...(changes as Partial<Task>) }
              : task,
          ),
        );
      }
      return result;
    },
  });
  const sheet = useSheet({
    columnResizeDirection: rtl ? 'rtl' : 'ltr',
    columns,
    data: tasks,
    getRowId: (task) => task.id,
    cellStatus,
    rowChanges,
  });

  return <Sheet instance={sheet} />;
}
