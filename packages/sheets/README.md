# @codemancers/sheets

A spreadsheet-style data grid for React, extracted from Gather. It has headless hooks built on [TanStack Table](https://tanstack.com/table) v8, plus ready-made components styled with Tailwind CSS v4.

> **Pre-release:** it isn't on npm yet. The full docs come with v0.1.0.

## Setup

You need React 18.2+ or 19 and TanStack Table v8. The components also need Tailwind CSS v4; the headless hooks don't.

1. Install the package with TanStack Table: `pnpm add @codemancers/sheets @tanstack/react-table`
2. In the stylesheet where you import Tailwind, add the package after it:

   ```css
   @import 'tailwindcss';
   @import '@codemancers/sheets/styles.css';
   ```

   This adds the components' class names to your Tailwind build.

3. **Dark mode.** The components use `dark:` classes. By default, Tailwind's `dark:` follows the OS setting. If your app has no dark mode, or switches it with a class, add this line. Without it, the sheet turns dark by itself on machines set to dark mode:

   ```css
   @custom-variant dark (&:where(.dark, .dark *));
   ```

## Entry points

| Import                           | Contents                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@codemancers/sheets`            | Headless: `useSheet` (TanStack's `useReactTable` with a sheet's defaults), plus the editing hooks `useCellStatus`, `useRowChanges`, `useInlineEdit` and `useSheetCellScope` |
| `@codemancers/sheets/ui`         | Components: `Sheet`, plus cells such as `SheetTextCell`, `SheetPrimaryCell` and `SheetEditableTextCell`                                                                     |
| `@codemancers/sheets/styles.css` | The Tailwind v4 entry from Setup                                                                                                                                            |

Columns are plain TanStack `ColumnDef`s, and `useSheet` takes every `useReactTable` option, so [TanStack Table's docs](https://tanstack.com/table/v8/docs/guide/column-defs) apply as they are. `useSheet` sorts and filters in the browser by default. For server-side data, pass `manualSorting` / `manualFiltering` and control the state, as in TanStack.

## Example

The hooks use React state, so render the sheet from a client component. In Next.js, that means a file with `'use client'`. Give the sheet a container with a height; it scrolls inside it.

```tsx
'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useSheet } from '@codemancers/sheets';
import { Sheet, SheetTextCell } from '@codemancers/sheets/ui';

type Task = { id: string; title: string; owner: string };

const task = createColumnHelper<Task>();

// Defined once, outside the component, as TanStack recommends.
const columns = [
  task.accessor('title', { header: 'Title', size: 280 }),
  task.accessor('owner', {
    header: 'Owner',
    cell: ({ getValue }) => <SheetTextCell muted>{getValue()}</SheetTextCell>,
  }),
];

export function TaskSheet({ tasks }: { tasks: Task[] }) {
  const sheet = useSheet({ columns, data: tasks, getRowId: (task) => task.id });

  return (
    <div style={{ height: 400 }}>
      <Sheet instance={sheet} emptyState="No tasks yet." />
    </div>
  );
}
```

## Development

```sh
pnpm nx test @codemancers/sheets
pnpm nx build @codemancers/sheets
```
