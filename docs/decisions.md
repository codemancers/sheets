# Decisions

Why `@codemancers/sheets` is built the way it is. [architecture.md](architecture.md) describes how the pieces fit together.

When you make a choice that a future contributor would question, add it here.

## Package

- **One package with three entry points.** The headless hooks (`@codemancers/sheets`), the components (`/ui`) and the theme (`/styles.css`) ship together, so there's one version to install and keep in step. An app that renders its own markup imports the headless entry only, and gets no components or styles.
- **Built with `tsc` to ES modules, with no bundler.** Each source file becomes one module and keeps its `'use client'` directive, which the Next.js App Router needs.
- **No runtime dependencies.** The icons are inlined from Heroicons and Lucide, with their licence notices, and a small `cx` helper replaces `clsx`.
- **TanStack Table is a peer dependency.** Apps import `createColumnHelper` and TanStack's types themselves, and extend `ColumnMeta` and `TableMeta` through module augmentation. Under pnpm an app can only augment a module it has installed. A peer dependency also keeps a single copy of TanStack in the app.
- **TanStack Table v9.** v8 and v9 can't share a peer range: v9's types take the feature set as their first argument, and its tables are built from registered features. `@codemancers/sheets` 0.2 is the last release for v8.
- **React 19 only.** The apps that use the package are on React 19, so React 18 isn't tested or supported.
- **The components need Tailwind v4.** They're styled with Tailwind classes, and `styles.css` adds those classes to the app's Tailwind build, so there's no separate stylesheet to load or override. An app without Tailwind can add it, or build its own markup on the headless layer.
- **The package ships its source.** `styles.css` contains `@source './'`, which makes the app's Tailwind build scan the package's source files for class names. That only works if `src/` is published.

## API

- **Plain TanStack options and column definitions.** `useSheet` takes everything `useTable` takes, and columns are TanStack `ColumnDef`s. An earlier custom column type covered only part of TanStack, and had to be translated. With the plain API, every TanStack option and guide applies as it is.
- **Sheet defaults that any option overrides:**
  - Sorting and filtering run in the browser. TanStack skips them when `manualSorting` or `manualFiltering` is set, which is how an app sorts or filters on the server.
  - Columns resize live as they're dragged.
  - TanStack's faceting is on, so a values filter can list a column's values and count them. It costs nothing until a filter asks.
- **Options passed as `undefined` are dropped.** TanStack spreads the options over its defaults, so `onSortingChange: undefined` replaced TanStack's internal handler, and sorting and resizing silently did nothing.
- **One fixed feature set.** TanStack v9 includes only registered features, and types every table by its feature set. The sheet registers what it renders with (sorting, column filtering and faceting, sizing, resizing, visibility, row pinning) and what v8 gave apps for free that the README documents (global filtering, column order). Apps can't pass their own set: v9's docs type tables and components with one set, and a component can't be typed for any set that includes the sheet's without casting the table's types away. The cost is that features the sheet doesn't register, such as row selection, aren't available, and a `valuesFilter` checklist can't take its values from a server. When an app needs a feature, it's added to the set.
- **Only the sort and filter functions TanStack picks by itself are registered.** v9 resolves a name, and `'auto'`, from the registered functions only, and its full registries are deprecated because they defeat tree-shaking. Registering the ones `'auto'` chooses keeps columns sorting and filtering as they did in v8. Any other function goes straight on the column as its `sortFn` or `filterFn`.
- **A column opts into a header filter through its `filterFn`.** Setting `filterFn: textFilter` or `filterFn: valuesFilter` both filters the column and gives its header the matching control, so one property says what the filter does and what the user sees. Filters aren't on for every column, though TanStack allows that: its `'auto'` filter function is picked from the first row's value, which gives a column of objects or numbers a filter that doesn't work. A `ColumnMeta` flag was the other option, but it would need a matching `filterFn` set alongside it, in a second place to keep in step.
- **Visual settings are `Sheet` props.** `rowHeight`, `highlightedRowId`, `openRowId` and `labels` only affect the rendering, so they aren't table state.
- **Rows are identified by TanStack's `row.id`.** Statuses, staged values, and the highlighted and open rows all use it, so `getRowId` makes them follow a record through sorting and refetches.

## Editing and saving

- **Typing into a focused cell opens it, replacing the value.** That's how a spreadsheet takes data entry: type, press Tab, type again. The W3C's grid pattern also lists letters and F2 as ways into a cell's editor. Space still opens the editor with the value kept, since it's how a button is pressed. The cost is that one stray key and a click away saves a one-character value, because blur saves. Escape undoes it. Only the built-in cells do this; a cell built on `useInlineEdit` calls `beginEdit(draft)` itself.
- **Outcomes show on the cell:**
  - A dot while unsaved, a spinner while saving, a tick once saved, or an error icon with a tooltip. A toast can't say which cell it's about.
  - The cell itself isn't tinted, because in a grid with a few bad values, tinting turns it into a wall of red.
- **Errors stay until the user acts on them.** An error describes something that's still true: the value wasn't saved. So it doesn't expire. The saved tick clears after 2 seconds.
- **A refused value stays on screen.** The cell keeps showing what was typed, next to its error, so a typo is fixed rather than retyped. Committing it again retries the save, even though it hasn't changed.
- **Statuses and staged values live above the table,** in `useCellStatus` and `useRowChanges`. Rows unmount when the data is sorted or refetched, and an unsaved edit has to survive that.
- **Every sheet has a `cellStatus`.** `useSheet` creates one when the app passes none, so a schema always runs and a failure always has somewhere to show. Apps that save per row still pass their own, because `useRowChanges` reports to the same instance.
- **A failed `onCommit` shows like a refused value.** `onCommit` can return `{ error }`, or throw. The editor still closes, and the cell shows the error with the typed value kept for a retry. That's the model existing rows already use, and it works for a new row too. Keeping the editor open instead would put the error icon over the text being typed.
- **`onCancel` means the edit ended with nothing to save.** Escape calls it, and so do Enter and blur with the value unchanged. A new row left empty then removes itself, instead of sitting there until someone finds Escape.
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
- **Labels are compared by value.** Apps pass `labels` inline, a new object on every render. `Sheet` keeps the merged labels while their values are the same, so the context changes only when the text does, and a memoised component that reads them stays still.
- **A drag re-renders only the resize handle.** This follows TanStack v9's [advanced column resizing performance](https://tanstack.com/table/latest/docs/framework/react/guide/column-resizing#advanced-column-resizing-performance) steps, and its performant resizing example. Where the sheet differs from the example:
  - **The selector leaves out only the resize state.** The example's table selects nothing (`() => ({})`), but a sheet re-renders for sorting, filters, pinning, visibility and order. So `useSheet`'s selector returns every other slice, and `table.state` has no widths. Apps read them with `table.atoms.columnSizing.get()`, or subscribe.
  - **`Sheet` also sets `--sheet-columns` when it renders.** The example only writes it in a layout effect, which is enough in a client-only app. Without the render-time value, server-rendered HTML would have no column tracks until hydration, and hiding, showing or moving a column would need the effect to subscribe to more state.
  - **The layout effect depends on `table`.** The example subscribes once, with `[]`. `useTable` returns a new object whenever the app re-renders, so `Sheet`'s effect re-subscribes with the current table instead of keeping the first.
  - **The handle uses the standalone `Subscribe`.** A header's `table` is TanStack's core table, which has no `Subscribe`. TanStack's React Compiler guide says to use the standalone one, with `table.store` as its source.
  - **No `content-visibility: auto` on rows.** The example sets it, but it isn't one of the guide's steps, and it changes how rows off screen are laid out.
  - This replaced a memo that skipped the body while a column was dragged, which the guide now calls the older approach. An app that controls `columnSizing` through `state` re-renders on every resize, and now its rows do too, where the memo skipped them. TanStack's column sizing guide recommends an external atom for owning the widths, and that doesn't re-render the app.
- **New rows stay put through TanStack's row pinning,** not a new-row API. The body renders pinned top and bottom rows around the rest, and an app pins its new row to the bottom, so a sort can't move it. That keeps the plain TanStack API, and works for any row an app wants fixed.
- **The filter panel is a native popover, placed with CSS anchor positioning.** The top layer keeps it from being clipped by the sheet's scroll container, and the browser closes it on a click outside and returns focus to its button, so there's no portal and no positioning code. Anchor positioning has been in every major browser since January 2026.
- **Filter controls mount only while the panel is open.** A checklist counts its column's values when it mounts, so a sheet with many filterable columns doesn't count them all on every render. Mounting on open also lets `autoFocus` move focus into the panel, which content that's always mounted couldn't do.
- **No virtualization yet.** Every row is rendered. The playground's 1,000-row demo shows how that performs. Virtualization is planned for a later release.
- **The add-row button follows the last row,** rather than being pinned to the bottom of the sheet, and sits in the row-number column, where the next row's number would be. It belongs with the rows it adds to, and on a short list a pinned footer left a gap above it. On a long list, you scroll to the end to reach it.
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
- **Releases publish from GitHub Actions through npm's trusted publishing.** No npm token is stored, so there's none to leak or rotate.
- **A GitHub release starts a release, not Nx Release.** Nx Release versions, commits and tags in one local step, but every change here goes through a pull request. So the version is bumped in a pull request, and publishing a GitHub release afterwards also gives each version its release notes.
- **0.x until the API settles.** Until 1.0, a breaking change bumps the minor version.
