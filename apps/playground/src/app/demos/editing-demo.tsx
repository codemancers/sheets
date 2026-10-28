import { useCallback, useMemo, useState } from 'react';
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
  useSheetCellScope,
} from '@codemancers/sheets/ui';
import { makeTasks, requiredTitle, saveTask, type Task } from '../data';

type UpdateTask = (id: string, changes: Partial<Task>) => void;

/**
 * Saves on its own commit, outside the row buffer, so it has to report the
 * outcome to the cell itself.
 */
function OwnerCell({ task, onSaved }: { task: Task; onSaved: UpdateTask }) {
  const scope = useSheetCellScope();
  return (
    <SheetEditableTextCell
      value={task.owner}
      placeholder="Unassigned"
      onCommit={async (owner) => {
        const status = scope?.cellStatus;
        try {
          const result = await saveTask({ owner });
          if (result?.error) {
            status?.rejectCellValue(task.id, 'owner', result.error, owner);
            return;
          }
          onSaved(task.id, { owner });
          status?.setCellSaved(task.id, 'owner');
        } catch {
          status?.rejectCellValue(
            task.id,
            'owner',
            'Could not save. Check your connection.',
            owner,
          );
        }
      }}
    />
  );
}

export function EditingDemo() {
  const [tasks, setTasks] = useState(() => makeTasks(6));
  const updateTask = useCallback<UpdateTask>(
    (id, changes) =>
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...task, ...changes } : task,
        ),
      ),
    [],
  );

  const cellStatus = useCellStatus();
  const rowChanges = useRowChanges({
    cellStatus,
    flush: { debounce: 600 },
    onSubmitRow: async (rowId, changes) => {
      const result = await saveTask(changes);
      if (!result) updateTask(rowId, changes);
      return result;
    },
  });

  // Keep columns stable: rebuilding them remounts every cell and closes any
  // open editor.
  const columns = useMemo(
    () => [
      defineSheetColumn<Task>({
        id: 'title',
        header: 'Title · saved per row',
        accessor: 'title',
        type: 'editableText',
        width: 320,
        cell: ({ row }) => (
          <SheetPrimaryCell
            href={`#task-${row.id}`}
            onOpenDrawer={() => undefined}
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
        header: 'Owner · saved per cell',
        accessor: 'owner',
        type: 'editableText',
        width: 220,
        cell: ({ row }) => (
          <OwnerCell task={row.original} onSaved={updateTask} />
        ),
      }),
      defineSheetColumn<Task>({
        id: 'status',
        header: 'Status',
        accessor: 'status',
        type: 'text',
        cell: ({ getValue }) => (
          <SheetTextCell muted>{String(getValue())}</SheetTextCell>
        ),
      }),
    ],
    [updateTask],
  );

  const sheet = useSheet({
    columns,
    data: tasks,
    getRowId: (task) => task.id,
    cellStatus,
    rowChanges,
  });

  return <Sheet instance={sheet} />;
}
