import { useEffect, useRef } from 'react';
import type { Task } from '../data';

/**
 * The playground's own drawer. The package leaves this UI to the app, which
 * would use the drawer or dialog from its design system.
 */
export function TaskDrawer({
  task,
  onClose,
}: {
  task: Task | undefined;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus starts on the close button, and Escape closes.
  useEffect(() => {
    if (!task) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  const field = 'text-zinc-500 dark:text-zinc-400';
  return (
    <div
      role="dialog"
      aria-labelledby="task-drawer-title"
      className="fixed inset-y-0 end-0 z-50 flex w-96 max-w-full flex-col border-s border-zinc-950/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-4 border-b border-zinc-950/10 px-5 py-4 dark:border-white/10">
        <h2 id="task-drawer-title" className="text-base font-semibold">
          {task.title}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-950/10 px-2.5 py-1 text-sm hover:bg-zinc-950/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          Close
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-5 py-4 text-sm">
        <dt className={field}>Status</dt>
        <dd>{task.status}</dd>
        <dt className={field}>Owner</dt>
        <dd>{task.owner}</dd>
        <dt className={field}>Due</dt>
        <dd>{task.due}</dd>
      </dl>
    </div>
  );
}
