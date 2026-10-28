import type { SortingState } from '@tanstack/react-table';

export type Task = {
  id: string;
  title: string;
  status: string;
  owner: string;
  due: string;
};

const TITLES = [
  'Draft the launch post',
  'Set up the staging server',
  'Accessibility pass',
  'Publish v0.1.0',
  'Review the README',
  'Fix the flaky e2e test',
  'Plan sprint 12',
  'Migrate the billing page',
  'Audit API errors',
  'Write release notes',
];
const STATUSES = ['Todo', 'In progress', 'Blocked', 'Done'];
const OWNERS = ['Ada', 'Grace', 'Alan', 'Linus', 'Margaret'];

/** Deterministic, so screenshots and e2e assertions stay stable. */
export function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    title:
      i < TITLES.length ? TITLES[i] : `${TITLES[i % TITLES.length]} #${i + 1}`,
    status: STATUSES[(i * 7) % STATUSES.length],
    owner: OWNERS[(i * 3) % OWNERS.length],
    due: new Date(Date.UTC(2026, 10, 1 + ((i * 5) % 60)))
      .toISOString()
      .slice(0, 10),
  }));
}

/** What a server would do with `?sort=`: the sheet itself sorts nothing. */
export function sortTasks(tasks: Task[], sorting: SortingState) {
  const [sort] = sorting;
  if (!sort) return tasks;
  const key = sort.id as keyof Task;
  return [...tasks].sort(
    (a, b) => a[key].localeCompare(b[key]) * (sort.desc ? -1 : 1),
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A pretend PATCH. A title of "taken" is refused with a field error, and
 * anything containing "offline" fails in transit.
 */
export async function saveTask(changes: Record<string, unknown>) {
  await wait(400);
  const texts = Object.values(changes).map((v) => String(v).toLowerCase());
  if (texts.some((text) => text.includes('offline'))) {
    throw new Error('Network error');
  }
  if (String(changes.title).trim().toLowerCase() === 'taken') {
    return {
      error: 'That name is taken',
      fieldErrors: { title: ['That name is taken'] },
    };
  }
  return undefined;
}

/**
 * A Standard Schema, the interface zod, Valibot and ArkType schemas implement;
 * written by hand so the playground needs no validation library.
 */
export const requiredTitle = {
  '~standard': {
    version: 1 as const,
    vendor: 'playground',
    validate: (value: unknown) =>
      typeof value === 'string' && value.trim() !== ''
        ? { value }
        : { issues: [{ message: 'Title is required' }] },
  },
};
