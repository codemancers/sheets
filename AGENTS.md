# AGENTS.md

Instructions for AI coding agents working in this repository. [CONTRIBUTING.md](CONTRIBUTING.md) is the guide for people, and this file adds what an agent needs. [docs/architecture.md](docs/architecture.md) explains how the code fits together, and [docs/decisions.md](docs/decisions.md) explains why it's built this way.

## What this is

`@codemancers/sheets` is a spreadsheet-style data grid for React, built on TanStack Table v9. It's one package with three entry points:

| Import                           | Source (`packages/sheets/`)   | Contents                                                                                         |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `@codemancers/sheets`            | `src/index.ts` → `src/hooks/` | Headless: `useSheet`, the editing hooks, the cell context and `useRowDrawer`. No JSX, no styles. |
| `@codemancers/sheets/ui`         | `src/ui.ts` → `src/ui/`       | `Sheet` and the cells, styled with Tailwind v4 classes                                           |
| `@codemancers/sheets/styles.css` | `src/styles.css`              | The Tailwind `@source` entry and the `--color-sheet-*` theme tokens                              |

`apps/playground` is a Vite app with a demo of every feature, and it imports the package from source. `apps/playground-e2e` holds the Playwright tests and the axe scan.

## Commands

Run tasks through Nx, prefixed with pnpm:

```sh
pnpm install
pnpm exec playwright install chromium                       # once, before e2e
pnpm nx dev @codemancers/playground                         # http://localhost:4200
pnpm nx test @codemancers/sheets                            # unit tests
pnpm nx e2e @codemancers/playground-e2e                     # e2e tests and the axe scan
pnpm nx run-many -t lint test build typecheck e2e publint   # every task CI runs
pnpm nx format:write
```

## Before you say you're done

1. **Run what CI runs:**
   - `pnpm nx run-many -t lint test build typecheck e2e publint`
   - `pnpm nx format:check`
   - `pnpm nx sync:check`
   - `pnpm dlx knip@6`
2. **Typecheck from scratch** if you changed exported types. The incremental build can check the playground against stale declarations in `packages/sheets/dist`, and pass when it shouldn't:
   ```sh
   (cd packages/sheets && pnpm exec tsc --build --emitDeclarationOnly --force)
   (cd apps/playground && pnpm exec tsc --build --emitDeclarationOnly --force)
   ```
3. **Update the docs:**
   - If you changed the public API, update `packages/sheets/README.md`, including its API reference, and check that its examples still compile.
   - If you changed how state or data flows, update [docs/architecture.md](docs/architecture.md).
   - If you made a choice a future contributor would ask "why?" about, add it to [docs/decisions.md](docs/decisions.md).

## Rules for the code

- **Headless stays headless.** `src/hooks/` has no JSX, no styles, and no imports from `src/ui/`.
- **Colours** come only from the theme tokens in `src/styles.css` (`bg-sheet-*`, `text-sheet-*`, `border-sheet-*`). Pair each with a `dark:` class on its `-dark` token, where one exists. Don't use Tailwind palette classes in `src/ui/`.
- **Use logical classes** (`border-e`, `ps-2`, `end-0`, `text-start`), never left or right, so right-to-left layouts mirror.
- **Text:**
  - Text the sheet renders itself comes from `src/ui/labels.tsx`.
  - Text in a cell or hook is a prop or option with an English default.
  - Don't hard-code English anywhere else.
- **Modules** that use hooks or context start with `'use client'`. Relative imports end in `.js`, because the build uses `nodenext`.
- **No runtime dependencies,** only the peers: `react`, `@tanstack/react-table`, and optionally `tailwindcss`. Icons are inlined in `src/ui/icons.tsx`.
- **Body cells call the column's `cell` function directly** (`SheetCellContent` in `src/ui/sheet-row.tsx`) instead of going through `flexRender`. [docs/decisions.md](docs/decisions.md) explains why; read it before changing this.
- **Tests:**
  - A bug fix comes with a test that fails without it.
  - UI tests assert what a person gets: role, name, text, focus.
  - New playground features get e2e coverage.
  - The axe scan stays at zero violations.

## Git and pull requests

- **Branches:** start from `main`, and name the branch `feat/…`, `fix/…`, `docs/…`, `refactor/…`, `chore/…` or `ci/…`.
- **Commits and PR titles:**
  - Follow [Conventional Commits](https://www.conventionalcommits.org), in the imperative, for example `fix: keep cells mounted when the columns are rebuilt`.
  - A breaking change takes `!` and a `BREAKING CHANGE:` footer.
  - Keep a pull request to a few commits, grouped by kind.
- **PR descriptions:** fill in `.github/pull_request_template.md`, briefly.
- **No AI attribution:** no `Co-Authored-By` trailers, and no "Generated with" lines in commits or pull requests.
- **Releases:** maintainers cut them, as CONTRIBUTING.md describes. Don't bump the version, publish to npm or create a GitHub release unless asked.

## Gotchas

- **Updaters:** TanStack's `on…Change` handlers receive an updater, which may be a function of the previous state. React's `setState` accepts one as it is. Anything else has to resolve it first: `typeof updater === 'function' ? updater(old) : updater`.
- **Undefined options:** `useSheet` drops options passed as `undefined`, so `onSortingChange: undefined` keeps TanStack's internal handler. TanStack spreads options over its defaults, so passing the `undefined` through would break sorting.
- **Playwright names:** `getByRole(…, { name })` matches substrings. Use `exact: true` when names overlap, such as "Open" and "Open details page".
- **Counting rows:** header rows count as rows in tests (two of them with grouped headers), and so do the empty-state row and the add-row footer.
- **The lockfile:** `pnpm-lock.yaml` is excluded from Prettier, so let pnpm write it.
- **Unpacking packages:** don't unpack npm packages inside the repository. Nx treats every `package.json` as a project, and project discovery fails. Use `/tmp`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
