import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { RtlContext } from '../direction';
import { makeTasks, saveTask, type Task } from '../data';
import { taskColumns } from './task-columns';

const HIGHLIGHT_MS = 1500;

// The row being filled in. A fixed id keeps its error and typed title on the
// right row while the list changes, and pinning it to the bottom keeps a sort
// from moving it away from the add-row button.
const NEW_ROW = 'new';
const NEW_TASK: Task = {
  id: NEW_ROW,
  title: '',
  status: '',
  owner: '',
  due: '',
};
const NO_PINNED_ROWS = { top: [], bottom: [] };
const NEW_ROW_PINNED = { top: [], bottom: [NEW_ROW] };

export function AddRowDemo() {
  const rtl = useContext(RtlContext);
  const [tasks, setTasks] = useState(() => makeTasks(3));
  const [adding, setAdding] = useState(false);
  const [highlighted, setHighlighted] = useState<string>();
  const nextId = useRef(4);

  // Saved like the editing demo: "taken" is refused and "offline" fails. The
  // result goes back to the cell, which shows an error on itself and keeps
  // the title for a retry.
  const create = useCallback(async (title: string) => {
    const result = await saveTask({ title });
    if (!result?.error) {
      const id = String(nextId.current++);
      setTasks((current) => [
        ...current,
        { id, title, status: 'Todo', owner: 'Unassigned', due: '2026-12-31' },
      ]);
      setAdding(false);
      setHighlighted(id);
    }
    return result;
  }, []);
  // Escape, or leaving the row empty, discards it.
  const cancel = useCallback(() => setAdding(false), []);

  const columns = useMemo(
    () =>
      taskColumns(undefined, {
        id: NEW_ROW,
        onCommit: create,
        onCancel: cancel,
      }),
    [create, cancel],
  );
  const data = useMemo(
    () => (adding ? [...tasks, NEW_TASK] : tasks),
    [adding, tasks],
  );
  const sheet = useSheet({
    columns,
    data,
    getRowId: (task) => task.id,
    state: { rowPinning: adding ? NEW_ROW_PINNED : NO_PINNED_ROWS },
    columnResizeDirection: rtl ? 'rtl' : 'ltr',
  });

  // The Sheet highlights and scrolls to the row; clearing it is up to us.
  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(undefined), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  return (
    <Sheet
      instance={sheet}
      onAddRow={adding ? undefined : () => setAdding(true)}
      labels={{ addRow: 'Add task' }}
      highlightedRowId={highlighted}
    />
  );
}
