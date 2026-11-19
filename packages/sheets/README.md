# @codemancers/sheets

A spreadsheet-style data grid for React. It's built on [TanStack Table](https://tanstack.com/table/latest) and comes in two layers: headless hooks that add in-place editing, and ready-made components styled with Tailwind CSS v4.

![A sheet with a saved edit, and a refused one showing its reason](https://raw.githubusercontent.com/codemancers/sheets/main/docs/images/sheet.png)

- **Spreadsheet layout:** row numbers, a sticky header, resizable columns, grouped headers, an add-row button below the rows, and loading and empty states.
- **In-place editing:** click a cell, type, then Enter to save or Escape to cancel. Each cell shows its own status: unsaved, saving, saved or refused.
- **Saving per row:** edits to one row can be batched into a single request. If the server refuses a field, the error appears on that field's cell.
- **Validation** with any [Standard Schema](https://standardschema.dev) library (zod, Valibot, ArkType and others).
- **Plain TanStack Table underneath:** columns are TanStack `ColumnDef`s, and `useSheet` takes every `useTable` option.
- **Accessible:** screen readers see a real table, and sorting, resizing and editing all work from the keyboard.
- **Adaptable:** theme tokens, translatable labels, and right-to-left layouts.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Columns and cells](#columns-and-cells)
- [Sorting and filtering](#sorting-and-filtering)
- [Editing and saving](#editing-and-saving)
- [Layout and states](#layout-and-states)
- [Adding rows](#adding-rows)
- [Opening rows in a drawer](#opening-rows-in-a-drawer)
- [Customising](#customising)
- [Headless use](#headless-use)
- [Accessibility](#accessibility)
- [Next.js](#nextjs)
- [Limitations](#limitations)
- [API reference](#api-reference)

## Install

You need React 19 and TanStack Table v9. The components also need Tailwind CSS v4. The hooks alone don't.

```sh
pnpm add @codemancers/sheets @tanstack/react-table
```

Add the package's stylesheet after Tailwind, in the CSS file where you import Tailwind:

```css
@import 'tailwindcss';
@import '@codemancers/sheets/styles.css';
```

This adds the components' classes and theme tokens to your Tailwind build.

**Dark mode.** The components use `dark:` classes, and by default Tailwind's `dark:` follows the operating system. If your app has no dark mode, or switches it with a class, add this line; otherwise the sheet turns dark on its own for people whose OS is set to dark:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

## Quick start

```tsx
'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useSheet, type SheetFeatures } from '@codemancers/sheets';
import { Sheet, SheetTextCell } from '@codemancers/sheets/ui';

type Task = { id: string; title: string; status: string; owner: string };

const task = createColumnHelper<SheetFeatures, Task>();

const columns = task.columns([
  task.accessor('title', { header: 'Title', size: 280 }),
  task.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => <SheetTextCell muted>{getValue()}</SheetTextCell>,
  }),
  task.accessor('owner', { header: 'Owner' }),
]);

export function TaskSheet({ tasks }: { tasks: Task[] }) {
  const sheet = useSheet({
    columns,
    data: tasks,
    getRowId: (task) => task.id,
  });

  return (
    <div style={{ height: 480 }}>
      <Sheet instance={sheet} emptyState="No tasks yet." />
    </div>
  );
}
```

How the pieces fit together:

- `useSheet` is TanStack's `useTable` with a sheet's defaults and features. It returns `{ table, cellStatus, rowChanges }`.
- `SheetFeatures` tells TanStack's types which features the table has. It is the first type argument wherever TanStack asks for one.
- `<Sheet>` fills its parent and scrolls inside it, so give the parent a height.
- `getRowId` sets each row's id. Always set it to your data's own id: editing state, highlighting and React keys all use the row id. TanStack's default is the row's position, which changes when rows are sorted or added.
- Dark mode follows the operating system unless you add the one-line `@custom-variant dark` from [Install](#install).

## Columns and cells

Columns are plain TanStack column definitions, and TanStack's [column docs](https://tanstack.com/table/latest/docs/guide/column-defs) apply as they are. `meta`, `size`/`minSize`/`maxSize`, `enableSorting`, `sortFn`, `filterFn`, `header` functions and group columns all work. Define columns outside the component, or memoise them, as TanStack recommends.

Build the array with the helper's `columns()`, as above: it keeps each column's own value type, and TanStack's types reject a plain array of accessor columns. Without a column helper, type the array as `SheetColumnDef<Task>[]`.

A column without a `cell` renders its value as padded text. For anything else, render one of the built-in cells or your own markup:

| Cell                    | Use it for                                                                           | Main props                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `SheetTextCell`         | Text. This is also the default for plain values.                                     | `muted`                                                                                 |
| `SheetLinkCell`         | A link                                                                               | `href`, `LinkComponent`                                                                 |
| `SheetPrimaryCell`      | The row's name, with "open" and "details page" actions that appear on hover or focus | `href`, `onOpen`, `detailHref`, `openLabel`, `detailLabel`, `LinkComponent`, `editable` |
| `SheetEditableTextCell` | Text you click to edit                                                               | `value`, `onCommit`, `schema`, `stage`, `placeholder`, `autoFocus`, `onCancel`          |
| `SheetActionsCell`      | A row of buttons or menus                                                            | `children`                                                                              |

`SheetPrimaryCell` renders the name in one of three ways:

- **With `href`:** a link. With `onOpen` as well, a plain click opens the row in place (a side panel, a dialog) and a modified click still opens `href`.
- **With `onOpen` only:** a button that opens the row.
- **With neither:** plain text.

The panel icon appears only when `onOpen` is set (see [Opening rows in a drawer](#opening-rows-in-a-drawer)), and the details-page icon only when `detailHref` is set. Pass `editable` to rename in place instead (see [Editing and saving](#editing-and-saving)).

```tsx
task.accessor('title', {
  header: 'Title',
  cell: ({ row }) => (
    <SheetPrimaryCell href={`/tasks?open=${row.id}`} onOpen={() => openPanel(row.id)} detailHref={`/tasks/${row.id}`} openLabel="Open task" detailLabel="Open task page">
      {row.original.title}
    </SheetPrimaryCell>
  ),
});
```

**Grouped headers** span their columns:

```tsx
const columns = task.columns([
  task.group({
    id: 'task',
    header: 'Task',
    columns: task.columns([task.accessor('title', { header: 'Title' }), task.accessor('status', { header: 'Status' })]),
  }),
  task.accessor('owner', { header: () => <abbr title="Assigned to">Owner</abbr> }),
]);
```

## Sorting and filtering

Sorting and filtering run in the browser by default. Any column with an accessor is sortable through its header button; turn that off with `enableSorting: false` on the column or on the table.

**Filters.** Give a column one of the sheet's filter functions, and its header gets a filter button:

```tsx
import { textFilter, valuesFilter } from '@codemancers/sheets';

const columns = task.columns([task.accessor('title', { header: 'Title', filterFn: textFilter }), task.accessor('status', { header: 'Status', filterFn: valuesFilter })]);
```

- `textFilter` keeps the rows that contain the typed text, ignoring case.
- `valuesFilter` lists the column's values, each with its number of rows, and keeps the rows whose value is checked. The counts take the other columns' filters into account.

Columns without one of these have no filter button. When the filters leave no rows, the sheet says so, with a button that clears them. The state is TanStack's `columnFilters`: control it with `state.columnFilters` and `onColumnFiltersChange` to keep the filters in the URL, for example. For a search across every column, or controls of your own, use TanStack's APIs directly (`table.setGlobalFilter`, `column.setFilterValue`).

**Sort by what the cell shows.** A column sorts and filters by its accessor's value, which isn't always what its cell displays:

- If the value is an object, such as an assignee or a count object, TanStack can't order it. Set `enableSorting: false` on that column.
- If the cell shows something derived, such as a project's name for a `projectId`, sort by that instead with an accessor function:

  ```tsx
  task.accessor((row) => row.project?.name ?? '', { id: 'project', header: 'Project' });
  ```

- For an order that isn't alphabetical, such as statuses in workflow order, give the column a `sortFn`.

**Server-side data.** Set TanStack's manual flags (`manualSorting`, `manualFiltering`) and control the state. The sheet then reports the sort and the filters, and your data layer applies them. With `manualFiltering`, a `valuesFilter` checklist lists the values in the rows you've loaded.

```tsx
const [sorting, setSorting] = useState<SortingState>([]);
const { data = [] } = useTasksQuery({ sorting }); // your fetching

const sheet = useSheet({
  columns,
  data,
  getRowId: (task) => task.id,
  manualSorting: true,
  state: { sorting },
  onSortingChange: setSorting,
});
```

Any state you don't control (column widths, visibility, order) is managed by the table. Change handlers receive TanStack updaters, so a React state setter works as it is.

With `manualFiltering`, a `valuesFilter` checklist lists the values in the rows you've loaded.

### Feature set

TanStack Table v9 only includes the features a table registers. A sheet registers sorting, column and global filtering, faceting, column sizing, resizing, visibility and ordering, and row pinning, and that set is fixed: TanStack types a table by its feature set, so the sheet's components can't take a table with another. Other TanStack features, such as row selection or pagination, aren't available yet.

A column can name the sort and filter functions TanStack picks by itself: `'alphanumeric'`, `'text'`, `'datetime'` and `'basic'` to sort, and `'includesString'`, `'inNumberRange'`, `'inDateRange'`, `'equals'`, `'weakEquals'` and `'arrIncludes'` to filter. Pass any other function straight to the column:

```tsx
import { sortFn_textCaseSensitive } from '@tanstack/react-table';

task.accessor('title', { header: 'Title', sortFn: sortFn_textCaseSensitive });
```

## Editing and saving

Editable cells validate a value, hand it on, and show the outcome on the cell itself rather than in a toast. A toast can't say _which_ cell it means.

Cells report to the sheet's `cellStatus`. `useSheet` creates one if you don't pass it; pass your own `useCellStatus()` when `useRowChanges` or your own handlers report to it too.

### Saving per row (recommended)

`useRowChanges` makes the row, not the cell, the unit you save. Cells hand it their committed values, and it calls your `onSubmitRow` with everything changed in that row:

```tsx
import { useCellStatus, useRowChanges, useSheet } from '@codemancers/sheets';
import { Sheet, SheetEditableTextCell, SheetPrimaryCell } from '@codemancers/sheets/ui';

const columns = task.columns([
  task.accessor('title', {
    header: 'Title',
    cell: ({ row }) => <SheetPrimaryCell editable={{ value: row.original.title, schema: titleSchema }}>{row.original.title}</SheetPrimaryCell>,
  }),
  task.accessor('owner', {
    header: 'Owner',
    cell: ({ row }) => <SheetEditableTextCell value={row.original.owner} stage />,
  }),
]);

function TaskSheet({ tasks }: { tasks: Task[] }) {
  const cellStatus = useCellStatus();
  const rowChanges = useRowChanges({
    cellStatus,
    flush: { debounce: 600 },
    onSubmitRow: async (rowId, changes) => {
      const response = await fetch(`/api/tasks/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      // Nothing means success; { error, fieldErrors } means refused.
      if (!response.ok) return response.json();
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
```

- `SheetPrimaryCell` stages automatically when the sheet has a row buffer.
- `SheetEditableTextCell` stages only with `stage`. That keeps it usable for a new row, where saving means _creating_ the record rather than updating it.

**Flush policies:**

| `flush`                 | Behaviour                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `'immediate'` (default) | Sends every edit as soon as it's committed: one request per field.                                                          |
| `{ debounce: ms }`      | Waits for a pause in editing, then sends everything staged for that row as one request. Edits made during the wait join it. |

**What `onSubmitRow` returns:**

- **Success:** nothing (or `undefined`).
- **Refused:** `{ error, fieldErrors }`. `fieldErrors` maps column ids to messages, for example `{ title: ['That name is taken'] }`, and each message appears on its column's cell. If the server can't attribute the error, `error` appears on every cell that was sent.
- **Network failure:** throw. The cells then show `transportErrorMessage`, which defaults to "Could not save. Check your connection.".

**Cell statuses:**

| Status  | Shown as                     | Meaning                                                                                                                             |
| ------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Unsaved | A dot                        | Not saved yet: either a debounce is still waiting, or the server refused another field in the same request. Stays until it's saved. |
| Saving  | A spinner                    | The request is in flight.                                                                                                           |
| Saved   | A tick                       | Written. Clears itself after 2 seconds.                                                                                             |
| Refused | A warning icon and a tooltip | Not saved. Stays until the user acts on the cell, and is announced to screen readers.                                               |

**Behaviour you can rely on:**

- **A refused value stays on screen,** so the error has something to explain. Reopening the editor keeps the text, so a typo gets fixed rather than retyped.
- **Retrying works:** pressing Enter on the unchanged text sends it again. Editing back to the saved value, or pressing Escape, drops the refused value.
- **What a cell displays,** in order of priority: its staged value, then its refused value, then the value from your data. A refetch that lands mid-edit can't overwrite what the user just typed.
- **One request per row at a time.** A save waits for the one in flight instead of racing it.
- **A refused batch stays unsaved in full.** When the server refuses one field of a batch, it saved none of them. The other cells go back to "unsaved" rather than showing a tick.
- **Leaving the page:** whatever is queued is sent on unmount, but a cleanup can't wait for the response. If someone can navigate away mid-edit, check `rowChanges.hasStagedChanges()` and call `rowChanges.flushAll()` in your navigation guard.

### Saving per cell

Without `rowChanges`, each editable cell calls its own `onCommit`, where you perform the write. If it fails, return `{ error }`, or throw. The cell shows the error on itself and keeps the typed value, so the user can fix it and retry. While an async `onCommit` runs, the cell keeps showing the typed value:

```tsx
<SheetEditableTextCell
  value={row.original.title}
  onCommit={async (title) => {
    const response = await fetch(`/api/tasks/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    return response.ok ? undefined : { error: 'Could not save the title' };
  }}
/>
```

A thrown error shows the `saveFailed` label. For a tick on success, pass your own `useCellStatus()` to `useSheet` and call `cellStatus.setCellSaved(rowId, columnId)` in `onCommit`. Most apps should use `useRowChanges` with `flush: 'immediate'` instead, which shows saving and saved for you.

### Validation

Give an editable cell a `schema` and the value is checked before it's staged or committed. A failure appears on the cell with the schema's first message. Any [Standard Schema](https://standardschema.dev) works, including zod 3.24+, Valibot, ArkType and Yup; async schemas are awaited:

```tsx
import { z } from 'zod';

const titleSchema = z.string().trim().min(1, 'Title is required');

<SheetPrimaryCell editable={{ value: row.original.title, schema: titleSchema }}>{row.original.title}</SheetPrimaryCell>;
```

A value the schema rejects never enters the row buffer, so the rest of the row still saves without it. Sharing schemas with your API means both sides reject a value with the same message. The server still decides what only it can know, such as uniqueness, and reports that through `fieldErrors`.

### Your own editable cells

Inside a `Sheet`, a cell can find its row, its column and the editing state through context. That means any cell type can join the same saving and status model. Values don't have to be strings:

```tsx
import { useSheetCellEditing } from '@codemancers/sheets';

function PriorityCell({ value }: { value: number }) {
  const cell = useSheetCellEditing();
  const shown = Number(cell.stagedValue ?? cell.refusedValue ?? value);

  return (
    <select aria-label={cell.label} value={shown} onChange={(event) => cell.stage(Number(event.target.value))} className="w-full bg-transparent px-2">
      <option value={1}>High</option>
      <option value={2}>Medium</option>
      <option value={3}>Low</option>
    </select>
  );
}
```

- `useSheetCellEditing(schema?)` gives you:
  - `stage`, `canStage`, `stagedValue` and `refusedValue`
  - `submit(onCommit, value, failedMessage)`, which calls an app's `onCommit` and shows a returned `{ error }` on the cell, or `failedMessage` if it throws. `submittingValue` is the value while an async save runs.
  - `accepts`, which runs the schema and reports a failure on the cell
  - `abandon` and `clearOnEditStart`
  - `label`, the column's header, for naming your editor
- `useInlineEdit` handles text-style editors: Enter, Escape, saving on blur, IME input, and returning focus to the cell. It calls `onCancel` on Escape, and when an edit ends with nothing to save. `beginEdit(draft)` opens the editor on `draft` instead of the value, which is how the built-in cells open on a typed key.
- Report outcomes through `cellStatus`, and `SheetCell` draws the icons.

## Layout and states

`<Sheet>` fills its parent (`h-full w-full`) and scrolls inside it. The header stays pinned while the rows scroll, and the add-row button follows the last row, in the row-number column. Give the parent a height:

```tsx
// Fill the rest of a full-height page
<div className="flex h-svh flex-col">
  <header>…</header>
  <div className="min-h-0 flex-1">
    <Sheet instance={sheet} />
  </div>
</div>
```

Column widths come from `size` (TanStack's default is 150px). After the last column, an empty filler column takes up the remaining width. `rowHeight` sets the minimum row height (default 32px).

| Prop                     | What it does                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `isLoading`              | Shows placeholder rows inside the same frame and marks the rows busy for assistive tech. `loadingState` replaces the placeholders.        |
| `emptyState`             | Content for a row that spans the columns when there's no data. Defaults to the `empty` label.                                             |
| `onAddRow`               | Shows the add-row button, right below the rows. `addRowDisabled` disables it. See [Adding rows](#adding-rows).                            |
| `highlightedRowId`       | Highlights a row and scrolls it into view, and marks it `data-highlighted` for tests. Clear it after a moment to fade the highlight.      |
| `openRowId`              | Marks the row that is open in a drawer: highlighted, and announced as current. See [Opening rows in a drawer](#opening-rows-in-a-drawer). |
| `rowHeight`, `className` | The minimum row height, and extra classes for the scroll container.                                                                       |

```tsx
const [highlightedRowId, setHighlightedRowId] = useState<string>();

useEffect(() => {
  if (!highlightedRowId) return;
  const timer = setTimeout(() => setHighlightedRowId(undefined), 1500);
  return () => clearTimeout(timer);
}, [highlightedRowId]);

<Sheet instance={sheet} onAddRow={() => setHighlightedRowId(addTask().id)} highlightedRowId={highlightedRowId} />;
```

## Adding rows

`onAddRow` shows the add-row button. To create a record from a new row in the sheet, add a temporary row to `data`, and give its first cell an editor:

```tsx
const NEW_ROW = 'new';
const newRowPinned = { top: [], bottom: [NEW_ROW] };
const noPinnedRows = { top: [], bottom: [] };

function TaskSheet({ tasks }: { tasks: Task[] }) {
  const [adding, setAdding] = useState(false);

  const columns = useMemo(
    () =>
      task.columns([
        task.accessor('title', {
          header: 'Title',
          cell: ({ row }) =>
            row.id === NEW_ROW ? (
              <SheetEditableTextCell
                value=""
                placeholder="New task"
                autoFocus
                onCommit={async (title) => {
                  const result = await createTask(title); // { error } if refused
                  if (!result.error) setAdding(false);
                  return result;
                }}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <SheetPrimaryCell>{row.original.title}</SheetPrimaryCell>
            ),
        }),
      ]),
    [],
  );

  const sheet = useSheet({
    columns,
    data: adding ? [...tasks, { id: NEW_ROW, title: '' }] : tasks,
    getRowId: (task) => task.id,
    state: { rowPinning: adding ? newRowPinned : noPinnedRows },
  });

  return <Sheet instance={sheet} onAddRow={adding ? undefined : () => setAdding(true)} />;
}
```

- **Saving:** `onCommit` creates the record. Return `{ error }`, or throw, and the error shows on the new row with the typed text kept for a retry. Returning the result, as above, rather than returning only on failure, also passes TypeScript's `noImplicitReturns`.
- **Discarding:** `onCancel` runs on Escape, and when the editor closes with nothing typed (Enter, Tab or clicking away), so an empty new row goes away.
- **Staying at the bottom:** `state.rowPinning` pins the new row with TanStack's row pinning, so a sort can't move it. Pin it only while it's in `data`, because TanStack throws for a pinned id it can't find. Keep the pinning objects constant, as above, so resizing a column doesn't re-render every row.
- **A fixed id:** give the new row the same id every time, such as `'new'`. Its error and typed text are kept against that id.
- **`value=""`:** a new record has no saved value. Don't copy the typed text into `value`: an unchanged retry would then look like nothing to save, and discard the row.

The playground's "Adding rows" demo is a working version.

## Opening rows in a drawer

The package doesn't draw drawers; use the drawer, side panel or dialog from your design system. `useRowDrawer` keeps track of which row is open, and `<Sheet openRowId>` marks that row:

```tsx
import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useRowDrawer, useSheet, type SheetFeatures } from '@codemancers/sheets';
import { Sheet, SheetPrimaryCell } from '@codemancers/sheets/ui';

const task = createColumnHelper<SheetFeatures, Task>();

function Tasks({ tasks }: { tasks: Task[] }) {
  const drawer = useRowDrawer();
  const { open } = drawer;
  const columns = useMemo(
    () =>
      task.columns([
        task.accessor('title', {
          header: 'Title',
          cell: ({ row }) => (
            <SheetPrimaryCell href={`/tasks?open=${row.id}`} onOpen={() => open(row.id)}>
              {row.original.title}
            </SheetPrimaryCell>
          ),
        }),
      ]),
    [open],
  );
  const sheet = useSheet({ columns, data: tasks, getRowId: (t) => t.id });
  const openTask = tasks.find((t) => t.id === drawer.openRowId);

  return (
    <>
      <Sheet instance={sheet} openRowId={drawer.openRowId} />
      <YourDrawer open={openTask !== undefined} onClose={drawer.close}>
        {openTask && <TaskDetails task={openTask} />}
      </YourDrawer>
    </>
  );
}
```

- **What it gives you:** `openRowId`, `open(rowId)`, `close()`, `toggle(rowId)` and `isOpen(rowId)`. `open` and `close` keep the same identity across renders, so columns that use them can be built once.
- **Focus:** closing returns focus to whatever opened the row, so keyboard users land back where they were.
- **Keeping it in the URL:** to let an open drawer survive a refresh and be shared, control the state with your router or a library such as nuqs:

  ```tsx
  const [openId, setOpenId] = useQueryState('open'); // nuqs
  const drawer = useRowDrawer({ openRowId: openId, onOpenRowIdChange: setOpenId });
  ```

## Customising

### Colours

Every colour comes from a `--color-sheet-*` theme token. All but `accent` and `tooltip-fg` have a `-dark` partner, used under `dark:`. The defaults come from Tailwind's colour palette. To restyle, redefine tokens after the import:

```css
@import 'tailwindcss';
@import '@codemancers/sheets/styles.css';

@theme {
  --color-sheet-link: var(--color-indigo-600);
  --color-sheet-link-dark: var(--color-indigo-400);
}
```

To follow your design system's CSS variables, such as shadcn's, use `@theme inline`. The values then resolve wherever they're used, so variables that change under your dark-mode class keep working:

```css
@theme inline {
  --color-sheet-bg: var(--background);
  --color-sheet-bg-dark: var(--background);
  --color-sheet-fg: var(--foreground);
  --color-sheet-fg-dark: var(--foreground);
  --color-sheet-muted: var(--muted-foreground);
  --color-sheet-muted-dark: var(--muted-foreground);
  --color-sheet-link: var(--primary);
  --color-sheet-link-dark: var(--primary);
  --color-sheet-error: var(--destructive);
  --color-sheet-error-dark: var(--destructive);
}
```

| Token (each with a `-dark` partner, except `accent` and `tooltip-fg`) | Used for                                                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `sheet-bg`, `sheet-fg`                                                | Background and text. Borders and hover tints are `fg` at low opacity. |
| `sheet-muted`, `sheet-faint`                                          | Secondary text, and placeholders                                      |
| `sheet-raised`                                                        | The add-row button's row on hover, and the filter panel               |
| `sheet-skeleton`                                                      | Loading placeholders                                                  |
| `sheet-tooltip`, `sheet-tooltip-fg`                                   | The error tooltip                                                     |
| `sheet-link`, `sheet-link-hover`                                      | Links                                                                 |
| `sheet-accent`                                                        | The resize handle while it's dragged or focused, and an active filter |
| `sheet-error`, `sheet-success`, `sheet-warning`                       | The refused, saved and unsaved status icons                           |
| `sheet-highlight`                                                     | The highlighted row                                                   |

### Text and translation

`<Sheet labels={…}>` replaces any of the text the sheet renders itself:

| Label                        | Default                                       | Used for                                     |
| ---------------------------- | --------------------------------------------- | -------------------------------------------- |
| `rowNumber`                  | `Row`                                         | The name of the row-number column            |
| `sort(column)`               | `Sort {column}`                               | Header sort buttons                          |
| `resize(column)`             | `Resize {column}`                             | Resize handles                               |
| `width(pixels)`              | `{pixels} pixels`                             | A resize handle's current width, read out    |
| `filtered`                   | `(filtered)`                                  | Announced on a filtered column               |
| `filter(column)`             | `Filter {column}`                             | Header filter buttons, and their filters     |
| `filterText(column)`         | `{column} contains`                           | A text filter's input                        |
| `blank`                      | `(Blank)`                                     | An empty value in a filter's checklist       |
| `clearFilter`                | `Clear`                                       | Clears one column's filter                   |
| `noMatches`, `clearFilters`  | `No rows match the filters.`, `Clear filters` | The state when the filters leave no rows     |
| `unsaved`, `saving`, `saved` | `Unsaved`, `Saving`, `Saved`                  | Cell statuses, announced                     |
| `saveFailed`                 | `Could not save. Check your connection.`      | A cell's error when its `onCommit` throws    |
| `empty`                      | `No data.`                                    | The empty state, when `emptyState` isn't set |
| `addRow`                     | `Add row`                                     | The add-row button                           |

Cells and hooks take their own text props: `openLabel` and `detailLabel` on `SheetPrimaryCell`, `placeholder` on editable cells, and `transportErrorMessage` on `useRowChanges`.

### Right-to-left

Under `dir="rtl"` the layout mirrors. Pass TanStack's `columnResizeDirection` so that dragging and the arrow keys resize the right way:

```tsx
const sheet = useSheet({ columns, data, columnResizeDirection: 'rtl' });
```

## Headless use

`useSheet` returns a standard TanStack `table`, so you can render your own markup and still use the editing hooks:

```tsx
import { flexRender } from '@tanstack/react-table';
import { useSheet } from '@codemancers/sheets';

const { table } = useSheet({ columns, data, getRowId: (task) => task.id });

<table>
  <thead>
    {table.getHeaderGroups().map((group) => (
      <tr key={group.id}>
        {group.headers.map((header) => (
          <th key={header.id} colSpan={header.colSpan}>
            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
          </th>
        ))}
      </tr>
    ))}
  </thead>
  <tbody>
    {table.getRowModel().rows.map((row) => (
      <tr key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
        ))}
      </tr>
    ))}
  </tbody>
</table>;
```

`useCellStatus`, `useRowChanges` and `useInlineEdit` don't depend on the components. Wrap a cell in `SheetCellProvider` to give it the same context `<Sheet>` provides.

## Accessibility

- **Table semantics:** the sheet is a table to assistive tech. Headers carry `aria-sort`, and the row-number column is named. Loading rows are marked busy, and the placeholder rows are hidden.
- **Keyboard:**
  - Tab reaches the sort and filter buttons, resize handles, cells and row actions. Row actions appear on focus as well as hover.
  - A filter button opens its filter with focus inside it. Escape, or Enter in a text filter, closes it and returns focus to the button.
  - Enter or Space opens an editable cell with its value. In the built-in cells, F2 does too, and typing a character opens it with that character instead, replacing the value, as in a spreadsheet.
  - Enter saves, Escape cancels, and both return focus to the cell. Tab saves and moves on to the next cell, so you can type, press Tab and type again.
  - On a focused resize handle, the arrow keys resize the column (Shift for bigger steps), and a double-click resets it.
- **Screen readers:** editors are named after their column. Saving statuses are announced, and refused values are announced as alerts.
- **Testing:** the playground is scanned with axe in CI, and any violation fails the build.

Not yet supported: moving between cells with the arrow keys (`role="grid"`).

## Next.js

- Every module that uses hooks or context is marked `'use client'`. Render the sheet from a client component, and pass server data down as props.
- Import `@codemancers/sheets/styles.css` in the global stylesheet where you import Tailwind.
- To use Next's router for links, pass `LinkComponent={Link}`. To stop Next prefetching every row's link, wrap it: `LinkComponent={(props) => <Link prefetch={false} {...props} />}`.

## Limitations

- **No virtualisation yet.** Every row is rendered. Hundreds to a few thousand rows are fine; beyond that, render your own body with `@tanstack/react-virtual` through the headless API.
- **No column pinning,** and no arrow-key navigation between cells.
- **Text editors only.** The built-in editors are for text; other types need your own cells (see [Your own editable cells](#your-own-editable-cells)).
- **Two filters:** text, and a checklist of values. A range, such as dates, needs your own control, through TanStack's filter APIs.
- **TanStack Table v9 only.** Use `@codemancers/sheets` 0.2 with TanStack Table v8.
- **The error tooltip** on the very last row of a completely full sheet can extend past the bottom edge, and the sheet scrolls to show it.

## API reference

### `@codemancers/sheets`

| Export                                     | What it is                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useSheet(options)`                        | `useTable` with the sheet's feature set, plus `cellStatus` and `rowChanges`. Returns `{ table, cellStatus, rowChanges }`, where `cellStatus` is the one you passed or the sheet's own.                                                                                               |
| `useCellStatus()`                          | Per-cell outcomes: `setCellSaved`, `rejectCellValue`, `rejectFieldErrors`, `clearCellStatus`, `abandonCellValueChange`, `setCellDirty`, `setCellSaving`, `statuses`, `rejectedCellValue`.                                                                                            |
| `useRowChanges(options)`                   | The per-row save buffer. Options: `onSubmitRow`, `cellStatus`, `flush`, `transportErrorMessage`. Returns `stageCellValue`, `discardCellValue`, `stagedCellValue`, `hasStagedChanges`, `flushAll`.                                                                                    |
| `useInlineEdit(options)`                   | Edit-in-place state for a text editor: `isEditing`, `beginEdit(draft?)`, `commit`, `cancel`, `inputProps`, `triggerRef`. Calls `onCancel` on Escape, and when an edit ends unchanged.                                                                                                |
| `useRowDrawer(options?)`                   | Which row is open in a drawer or panel: `openRowId`, `open`, `close`, `toggle`, `isOpen`. Options: `openRowId` and `onOpenRowIdChange` to control it, or `defaultOpenRowId`.                                                                                                         |
| `useSheetCellEditing(schema?)`             | The editing context for a cell, for building your own (see above).                                                                                                                                                                                                                   |
| `textFilter`, `valuesFilter`               | Filter functions for a column's `filterFn`: the text it contains, or one of a checklist of values. Either one gives the column's header a filter button.                                                                                                                             |
| `SheetCellProvider`, `useSheetCellScope()` | The row, column and editing context a cell reads.                                                                                                                                                                                                                                    |
| Types                                      | `SheetInstance`, `UseSheetOptions`, `SheetFeatures`, `SheetColumnDef`, `CellStatus`, `CellStatusState`, `RowChanges`, `RowChangesState`, `RowSubmitResult`, `RowFlushPolicy`, `RowDrawerState`, `UseRowDrawerOptions`, `CellCommitResult`, `SheetCellValidator`, `StandardSchemaV1`. |

### `@codemancers/sheets/ui`

| Export                                                                                                                     | What it is                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Sheet`                                                                                                                    | The grid. Props: [Layout and states](#layout-and-states) and `labels`.                       |
| `SheetTextCell`, `SheetLinkCell`, `SheetPrimaryCell`, `SheetEditableTextCell`, `SheetActionsCell`                          | The built-in cells.                                                                          |
| `SheetLabels`, `defaultSheetLabels`                                                                                        | The label type and the English defaults.                                                     |
| `SheetHeader`, `SheetRow`, `SheetCell`, `SheetRowNumber`, `SheetEmpty`, `SheetLoading`, `SheetAddRow`, `SheetSpacerColumn` | The pieces `Sheet` is built from, for composing your own. They must render inside a `Sheet`. |

### `@codemancers/sheets/styles.css`

The Tailwind v4 entry: it registers the components' classes and the theme tokens.

## License

[MIT](LICENSE)
