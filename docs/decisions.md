# Decisions

Why `@codemancers/sheets` is built the way it is. [architecture.md](architecture.md) describes how the pieces fit together.

When you make a choice that a future contributor would question, add it here.

## Package

- **One package with three entry points.** The headless hooks (`@codemancers/sheets`), the components (`/ui`) and the theme (`/styles.css`) ship together, so there's one version to install and keep in step. An app that renders its own markup imports the headless entry only, and gets no components or styles.
- **Built with `tsc` to ES modules, with no bundler.** Each source file becomes one module and keeps its `'use client'` directive, which the Next.js App Router needs.
- **No runtime dependencies.** The icons are inlined from Heroicons and Lucide, with their licence notices, and a small `cx` helper replaces `clsx`.
- **TanStack Table is a peer dependency.** Apps import `createColumnHelper` and TanStack's types themselves, and extend `ColumnMeta` and `TableMeta` through module augmentation. Under pnpm an app can only augment a module it has installed. A peer dependency also keeps a single copy of TanStack in the app.
- **TanStack Table v8.** Moving to v9 is planned for a later release.
- **The components need Tailwind v4.** They're styled with Tailwind classes, and `styles.css` adds those classes to the app's Tailwind build, so there's no separate stylesheet to load or override. An app without Tailwind can add it, or build its own markup on the headless layer.
- **The package ships its source.** `styles.css` contains `@source './'`, which makes the app's Tailwind build scan the package's source files for class names. That only works if `src/` is published.

## API

- **Plain TanStack options and column definitions.** `useSheet` takes everything `useReactTable` takes, and columns are TanStack `ColumnDef`s. An earlier custom column type covered only part of TanStack, and had to be translated. With the plain API, every TanStack option and guide applies as it is.
- **Sheet defaults that any option overrides:**
  - Sorting and filtering run in the browser. TanStack skips them when `manualSorting` or `manualFiltering` is set, which is how an app sorts or filters on the server.
  - Columns resize live as they're dragged.
- **Options passed as `undefined` are dropped.** TanStack spreads the options over its defaults, so `onSortingChange: undefined` replaced TanStack's internal handler, and sorting and resizing silently did nothing.
- **`autoResetPageIndex` is off.** There's no pagination UI, and resetting the page index on every data change loops forever when an app passes data that isn't memoised.
- **Visual settings are `Sheet` props.** `rowHeight`, `highlightedRowId`, `openRowId` and `labels` only affect the rendering, so they aren't table state.
- **Rows are identified by TanStack's `row.id`.** Statuses, staged values, and the highlighted and open rows all use it, so `getRowId` makes them follow a record through sorting and refetches.

## Editing and saving

- **Outcomes show on the cell:**
  - A dot while unsaved, a spinner while saving, a tick once saved, or an error icon with a tooltip. A toast can't say which cell it's about.
  - The cell itself isn't tinted, because in a grid with a few bad values, tinting turns it into a wall of red.
- **Errors stay until the user acts on them.** An error describes something that's still true: the value wasn't saved. So it doesn't expire. The saved tick clears after 2 seconds.
- **A refused value stays on screen.** The cell keeps showing what was typed, next to its error, so a typo is fixed rather than retyped. Committing it again retries the save, even though it hasn't changed.
- **Statuses and staged values live above the table,** in `useCellStatus` and `useRowChanges`. Rows unmount when the data is sorted or refetched, and an unsaved edit has to survive that.
- **Saves go per row.** A cell hands its value to `useRowChanges`, and the app's `onSubmitRow` writes the row. Whether each edit is sent at once (the default) or after a pause is then a flush setting, not a different design.
- **One write per row at a time.** Two writes to the same row can land in either order, and the older value can win. A flush waits for the row's write in flight.
- **A refused write leaves all its fields unsaved.** The API applies a row's fields in one write, so a clash on one field means none of them were saved.
- **`SheetEditableTextCell` stages only with `stage`.** It's also used for new rows, where a commit creates the record, and staging would update a row that doesn't exist yet. `SheetPrimaryCell` stages whenever the sheet has a row buffer.
- **Validation uses Standard Schema:**
  - zod 3.24+, Valibot, ArkType and Yup implement it, so an app passes its schema as it is.
  - The interface is copied into the package, as the spec intends, so there's no dependency.
  - Synchronous schemas are checked synchronously, so a valid value reaches `onCommit` without an extra `await`.
- **Staged and refused values are `unknown`,** so a number, date or select cell can stage its real value instead of a string.
- **Body cells call the column's `cell` function directly.** `flexRender` uses the renderer as the component type. So columns rebuilt on a render, such as an inline array or a `useMemo` whose dependencies changed, remounted every cell and closed any open editor. `SheetCellContent` is one stable component that calls the renderer. Headers still use `flexRender`.
- **Keyboard and IME:**
  - Enter is left to the IME while it's composing, so half-typed Japanese, Chinese or Korean text isn't committed.
  - Tab is left to the browser, and the blur commits. Committing on the keydown removed the input first, so focus landed back on the same cell.
  - After Enter or Escape, focus returns to the cell instead of dropping to the page.

## Rendering and performance

- **Column widths live in one CSS variable.** The root sets `--sheet-columns`, and every row lays out on it. Resizing a column changes that one value, instead of a prop on every row.
- **The body doesn't re-render while a column is dragged.** This is TanStack's advice for live resizing. It needs `useCellStatus` and `useRowChanges` to return memoised objects, so they do.
- **No virtualization yet.** Every row is rendered. The playground's 1,000-row demo shows how that performs. Virtualization is planned for a later release.
- **No empty gridlines below the last row.** When the rows don't fill the sheet, the space below them stays blank, since empty cells would look like rows that exist.

## Accessibility and languages

- **ARIA table roles and announcements:**
  - Row numbers are row headers.
  - Headers report their sort order with `aria-sort`.
  - Cell statuses are announced, errors with `role="alert"`.
  - The loading skeleton is hidden, and the body is marked `aria-busy` instead.
- **Keyboard resizing.** Each resize handle is a focusable separator that announces its width:
  - The arrow keys resize the column, by bigger steps with Shift.
  - A double-click resets the width.
- **Zero axe violations.** The end-to-end suite runs a strict axe scan, and CI fails on any violation.
- **Translatable text.** The sheet's own strings come from the `labels` prop, which has English defaults. Cells and hooks take their text as props or options.
- **Right-to-left.** Logical classes such as `border-e` and `ps-2` mirror the layout under `dir="rtl"`, and TanStack's `columnResizeDirection` makes resizing and the arrow keys match.

## Styling

- **Theme tokens.** Every colour comes from a `--color-sheet-*` token, declared with Tailwind's `@theme`. An app restyles the sheet by redefining tokens, or maps them to its design system's variables with `@theme inline`. The defaults keep the original look.
- **Dark mode through `dark:`.** Tokens that change in dark mode have a `-dark` partner, applied with Tailwind's `dark:` variant, so the app's own dark-mode setting decides when it's used.

## Opening rows

- **A hook, not a drawer.** `useRowDrawer` holds which row is open, and apps render their own drawer, side panel or dialog. The hook handles the parts that are easy to get wrong: returning focus to whatever opened the row, and letting the app keep the open row in the URL. The playground's drawer is an example, not part of the package.

## Repository

- **Nx conventions:**
  - Nx plugins infer each project's targets from its config files.
  - Project names are the package names, and local packages are linked with `workspace:*`.
  - `nx sync` keeps the TypeScript project references up to date.
  - CI runs only the tasks a change affects.
- **The workspace runs on the package's source.** The custom `@codemancers/source` export condition points the playground and TypeScript at `src`, so there's no build step while developing.
- **knip checks for dead code in CI.**
- **pnpm is pinned** through `packageManager` in `package.json`.
- **Prettier skips `pnpm-lock.yaml`,** so pnpm is the only thing that writes it.
