import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { RtlContext } from './direction';
import { AddRowDemo } from './demos/add-row-demo';
import { EditingDemo } from './demos/editing-demo';
import { LargeDemo } from './demos/large-demo';
import { SortingDemo } from './demos/sorting-demo';
import { StatesDemo } from './demos/states-demo';

// Lucide's maximize-2 and minimize-2 (ISC): the two-headed expand arrows.
function ExpandIcon({ collapse = false }: { collapse?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {collapse ? (
        <>
          <path d="m14 10 7-7" />
          <path d="M20 10h-6V4" />
          <path d="m3 21 7-7" />
          <path d="M4 14h6v6" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" />
          <path d="m21 3-7 7" />
          <path d="m3 21 7-7" />
          <path d="M9 21H3v-6" />
        </>
      )}
    </svg>
  );
}

const iconButton =
  'rounded-md border border-zinc-950/10 p-1.5 text-zinc-600 hover:bg-zinc-950/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10';

/** `?full=<demo id>` opens that demo full screen, e.g. for a recording. */
function isFullInUrl(id: string) {
  return new URLSearchParams(window.location.search).get('full') === id;
}

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
  const [full, setFull] = useState(() => isFullInUrl(id));
  const expandRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);

  const exit = useCallback(() => {
    setFull(false);
    // Back to the expand button once the full-screen frame has gone.
    setTimeout(() => expandRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!full) return;
    const url = new URL(window.location.href);
    url.searchParams.set('full', id);
    window.history.replaceState(null, '', url);
    document.documentElement.classList.add('overflow-hidden');
    exitRef.current?.focus();

    // On window, so it runs after document listeners: an open cell editor or
    // drawer that handles Escape marks it handled and keeps full screen.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) exit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('overflow-hidden');
      const current = new URL(window.location.href);
      if (current.searchParams.get('full') === id) {
        current.searchParams.delete('full');
        window.history.replaceState(null, '', current);
      }
    };
  }, [full, id, exit]);

  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={id} className="text-base font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
        <button
          ref={expandRef}
          type="button"
          onClick={() => setFull(true)}
          aria-label={`Full screen: ${title}`}
          title="Full screen"
          className={iconButton}
        >
          <ExpandIcon />
        </button>
      </div>
      {/* The same element either way, so the sheet keeps its state. */}
      <div
        className={
          full
            ? 'fixed inset-0 z-40 flex flex-col bg-white dark:bg-zinc-900'
            : 'h-80 overflow-hidden rounded-lg border border-zinc-950/10 dark:border-white/10'
        }
      >
        {full && (
          <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-zinc-950/10 px-4 dark:border-white/10">
            <span className="text-sm font-semibold">{title}</span>
            <button
              ref={exitRef}
              type="button"
              onClick={exit}
              aria-label="Exit full screen"
              title="Exit full screen (Esc)"
              className={iconButton}
            >
              <ExpandIcon collapse />
            </button>
          </div>
        )}
        <div className={full ? 'min-h-0 flex-1' : 'h-full'}>{children}</div>
      </div>
    </section>
  );
}

function RtlToggle({
  rtl,
  onChange,
}: {
  rtl: boolean;
  onChange: (rtl: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={rtl}
      onClick={() => {
        document.documentElement.dir = rtl ? 'ltr' : 'rtl';
        onChange(!rtl);
      }}
      className="rounded-md border border-zinc-950/10 px-3 py-1.5 text-sm hover:bg-zinc-950/5 dark:border-white/15 dark:hover:bg-white/10"
    >
      Right to left
    </button>
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

function App() {
  const [rtl, setRtl] = useState(false);
  return (
    <RtlContext.Provider value={rtl}>
      <div className="min-h-svh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
        <header className="flex items-center justify-between border-b border-zinc-950/10 px-8 py-4 dark:border-white/10">
          <h1 className="text-lg font-semibold">Sheets playground</h1>
          <div className="flex gap-2">
            <RtlToggle rtl={rtl} onChange={setRtl} />
            <DarkModeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-5xl space-y-12 px-8 py-10">
          <Demo
            id="sorting"
            title="Sorting and row actions"
            description="Server-side sorting (manualSorting): the sheet reports the sort and the app applies it. Click a title, or hover a row for its open icon, to open it in a drawer (useRowDrawer); Escape closes it."
          >
            <SortingDemo />
          </Demo>
          <Demo
            id="editing"
            title="Inline editing"
            description={
              <>
                Click a title or owner to edit. A row&apos;s edits are batched
                into one save after a 600 ms pause. Type <code>taken</code> as a
                title to have it refused, or <code>offline</code> anywhere for a
                network error.
              </>
            }
          >
            <EditingDemo />
          </Demo>
          <Demo
            id="adding-rows"
            title="Adding rows"
            description={
              <>
                The footer opens a new row at the bottom, where it stays even
                when the list is sorted. Type a title and press Enter to create
                the task, or leave it empty to discard it. Type{' '}
                <code>taken</code> to have the create refused, or{' '}
                <code>offline</code> for a network error.
              </>
            }
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
            description="Sorted and filtered in the browser, the default: filter Title by its text, and Status and Owner by their values. Grouped headers, and a header that renders markup. No virtualization yet, so every row is rendered."
          >
            <LargeDemo />
          </Demo>
        </main>
      </div>
    </RtlContext.Provider>
  );
}

export default App;
