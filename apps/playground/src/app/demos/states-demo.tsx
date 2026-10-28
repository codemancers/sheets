import { useMemo, useState } from 'react';
import { useSheet } from '@codemancers/sheets';
import { Sheet } from '@codemancers/sheets/ui';
import { makeTasks } from '../data';
import { taskColumns } from './task-columns';

const TASKS = makeTasks(4);
const STATES = ['Data', 'Loading', 'Empty'] as const;

export function StatesDemo() {
  const [state, setState] = useState<(typeof STATES)[number]>('Loading');
  const columns = useMemo(() => taskColumns(() => undefined), []);
  const sheet = useSheet({
    columns,
    data: state === 'Data' ? TASKS : [],
    getRowId: (task) => task.id,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-zinc-950/10 p-2 dark:border-white/10">
        {STATES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={state === option}
            onClick={() => setState(option)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-950/5 aria-pressed:bg-zinc-950 aria-pressed:text-white dark:text-zinc-300 dark:hover:bg-white/10 dark:aria-pressed:bg-white dark:aria-pressed:text-zinc-950"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <Sheet
          instance={sheet}
          isLoading={state === 'Loading'}
          emptyState="No tasks match this filter."
        />
      </div>
    </div>
  );
}
