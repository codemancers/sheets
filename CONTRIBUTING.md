# Contributing

[docs/architecture.md](docs/architecture.md) explains how the code fits together, and [docs/decisions.md](docs/decisions.md) explains why it's built this way. AI coding agents follow [AGENTS.md](AGENTS.md).

## Setup

1. Install Node 24 and pnpm. The pnpm version is pinned through `packageManager` in `package.json`, and pnpm 9.7+ or Corepack picks it up.
2. Run `pnpm install`.
3. Before the first end-to-end run, install Chromium: `pnpm exec playwright install chromium`.

## Commands

| Command                                                     | What it does                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm nx dev @codemancers/playground`                       | The playground at http://localhost:4200. Edits to the package reload live.                         |
| `pnpm nx test @codemancers/sheets`                          | Unit tests (Vitest and Testing Library)                                                            |
| `pnpm nx e2e @codemancers/playground-e2e`                   | End-to-end tests and the axe accessibility scan (Playwright)                                       |
| `pnpm nx run-many -t lint test build typecheck e2e publint` | Every task CI runs. `publint` checks the package is ready to publish.                              |
| `pnpm nx format:write`                                      | Formats the code with Prettier. CI runs `nx format:check`.                                         |
| `pnpm nx sync:check`                                        | Checks that the TypeScript project references match the dependencies. `pnpm nx sync` updates them. |
| `pnpm dlx knip@6`                                           | Finds unused files, exports and dependencies                                                       |

## How the package is organised

- `packages/sheets/src/hooks`: the headless layer. It has no JSX and no styles: `useSheet`, the editing state, the cell context and `useRowDrawer`.
- `packages/sheets/src/ui`: components styled with Tailwind. Their colours come from the theme tokens in `src/styles.css`.
- Entry points:
  - `src/index.ts`, published as `@codemancers/sheets`
  - `src/ui.ts`, published as `@codemancers/sheets/ui`
  - `src/styles.css`

## Making a change

- **Branches:** branch from `main` with a name for the kind of change: `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `chore/…` or `ci/…`.
- **Commits:** follow [Conventional Commits](https://www.conventionalcommits.org). Mark a breaking change with `!` and a `BREAKING CHANGE:` footer. Keep a pull request to a few commits, grouped by kind.
- **Pull requests:** title them the same way as commits, for example `fix: keep cells mounted when the columns are rebuilt`. Fill in the template that opens with the pull request, and keep it brief.
- **Tests:**
  - Every bug fix comes with a test that fails without the fix.
  - For UI behaviour, test what a person gets (role, name, text, focus), not only that a callback ran.
- **Accessibility:** the axe scan must stay at zero violations; CI fails on any.
- **Styling:**
  - Use the theme tokens for colours (`bg-sheet-*`, `text-sheet-*`, `border-sheet-*`), never palette classes, so apps can restyle.
  - Use logical classes (`border-e`, `ps-2`, `end-0`, `text-start`) rather than left and right, so right-to-left layouts keep working.
- **Text:** text the sheet renders itself goes through the labels in `src/ui/labels.tsx`. Text in a cell or hook is a prop or option with an English default, like `SheetPrimaryCell`'s `openLabel`. Either way, an app can translate it.
- **New features:** add a demo to the playground and cover it in `apps/playground-e2e`.
- **Decisions:** when you make a choice that a future contributor would question, add it to [docs/decisions.md](docs/decisions.md). If you change how state or data flows, update [docs/architecture.md](docs/architecture.md).

## Adding a cell type

1. Write the cell in `packages/sheets/src/ui/cells/`. Read its row and column from context (`useSheetCellEditing` or `useSheetCellScope`) rather than taking ids as props. Apps render cells inside a column's `cell` function and shouldn't have to pass them.
2. Report outcomes through the context's `cellStatus`, and don't render your own error text. `SheetCell` draws the icon, the tooltip and the screen-reader announcement.
3. Handle a missing context: a cell can be rendered outside a `Sheet`, for example in tests.
4. If it edits:
   - Accept `schema?: SheetCellValidator`, and run `accepts` before committing.
   - Decide whether it stages into the row buffer. Make staging opt-in, as `SheetEditableTextCell`'s `stage` is, since a commit can mean creating a row rather than updating one.
5. Export it from `src/ui/index.ts`, and document it in the package README.
6. Test it inside a `SheetCellProvider`. A cell rendered on its own exercises none of the status reporting.

## Releases

Not set up yet: the package isn't published.
