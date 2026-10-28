import { useState } from 'react';
import {
  defineSheetColumn,
  useCellStatus,
  useRowChanges,
  useSheet,
} from '@codemancers/sheets';
import {
  Sheet,
  SheetEditableTextCell,
  SheetPrimaryCell,
  SheetTextCell,
} from '@codemancers/sheets/ui';
import { makeTasks, requiredTitle, saveTask, type Task } from '../data';

const columns = [
  defineSheetColumn<Task>({
    id: 'title',
    header: 'Title',
    accessor: 'title',
    width: 320,
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
  defineSheetColumn<Task>({
    id: 'owner',
    header: 'Owner',
    accessor: 'owner',
    width: 220,
    cell: ({ row }) => (
      <SheetEditableTextCell
        value={row.original.owner}
        placeholder="Unassigned"
        stage
      />
    ),
  }),
  defineSheetColumn<Task>({
    id: 'status',
    header: 'Status',
    accessor: 'status',
    cell: ({ getValue }) => (
      <SheetTextCell muted>{String(getValue())}</SheetTextCell>
    ),
  }),
];

export function EditingDemo() {
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
            task.id === rowId ? { ...task, ...changes } : task,
          ),
        );
      }
      return result;
    },
  });
  const sheet = useSheet({
    columns,
    data: tasks,
    getRowId: (task) => task.id,
    cellStatus,
    rowChanges,
  });

  return <Sheet instance={sheet} />;
}
