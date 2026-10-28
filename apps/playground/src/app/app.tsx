import { useState, type ReactNode } from 'react';
import { AddRowDemo } from './demos/add-row-demo';
import { EditingDemo } from './demos/editing-demo';
import { LargeDemo } from './demos/large-demo';
import { SortingDemo } from './demos/sorting-demo';
import { StatesDemo } from './demos/states-demo';

function Demo({
  id,
  title,
  children,
  description,
}: {
  id: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <div className="h-80 overflow-hidden rounded-lg border border-zinc-950/10 dark:border-white/10">
        {children}
      </div>
    </section>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={() => {
        document.documentElement.classList.toggle('dark', !dark);
        setDark(!dark);
      }}
      className="rounded-md border border-zinc-950/10 px-3 py-1.5 text-sm hover:bg-zinc-950/5 dark:border-white/15 dark:hover:bg-white/10"
    >
      Dark mode
    </button>
  );
}

export function App() {
  return (
    <div className="min-h-svh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <header className="flex items-center justify-between border-b border-zinc-950/10 px-8 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Sheets playground</h1>
        <DarkModeToggle />
      </header>
      <main className="mx-auto max-w-5xl space-y-12 px-8 py-10">
        <Demo
          id="sorting"
          title="Sorting and row actions"
          description="Sorting is controlled: the app sorts its own data, the way a server would. Hover a row for the drawer and detail-page actions."
        >
          <SortingDemo />
        </Demo>
        <Demo
          id="editing"
          title="Inline editing"
          description={
            <>
              Click a title or owner to edit. Titles are batched per row after a
              600 ms pause; owners save on commit. Type <code>taken</code> for a
              refused title, or <code>offline</code> for a network error.
            </>
          }
        >
          <EditingDemo />
        </Demo>
        <Demo
          id="adding-rows"
          title="Adding rows"
          description="The footer adds a task, then highlights it and scrolls it into view."
        >
          <AddRowDemo />
        </Demo>
        <Demo
          id="states"
          title="Loading and empty states"
          description="The built-in skeleton and empty row."
        >
          <StatesDemo />
        </Demo>
        <Demo
          id="large"
          title="1,000 rows"
          description="Sticky header and row numbers. There is no virtualization yet, so every row is rendered."
        >
          <LargeDemo />
        </Demo>
      </main>
    </div>
  );
}

export default App;
