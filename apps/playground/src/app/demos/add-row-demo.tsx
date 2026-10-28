import { useEffect, useMemo, useState } from 'react';
import { useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { makeTasks, type Task } from '../data';
import { taskColumns } from './task-columns';

const HIGHLIGHT_MS = 1500;

export function AddRowDemo() {
  const [tasks, setTasks] = useState(() => makeTasks(3));
  const [highlighted, setHighlighted] = useState<string>();
  const columns = useMemo(() => taskColumns(), []);
  const sheet = useSheet({ columns, data: tasks, getRowId: (task) => task.id });

  // The Sheet highlights and scrolls to the row; clearing it is up to us.
  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const addRow = () => {
    const id = String(tasks.length + 1);
    const task: Task = {
      id,
      title: `New task ${id}`,
      status: 'Todo',
      owner: 'Unassigned',
      due: '2026-12-31',
    };
    setTasks((current) => [...current, task]);
    setHighlighted(id);
  };

  return (
    <Sheet
      instance={sheet}
      onAddRow={addRow}
      addRowLabel="Add task"
      highlightedRowId={highlighted}
    />
  );
}
