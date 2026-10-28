# Sheets

A spreadsheet-style data grid for React, built on [TanStack Table](https://tanstack.com/table). It has headless hooks, plus ready-made components with a default theme.

It is extracted from the Sheets component in Gather. **Work in progress:** the package isn't published yet.

## Repository layout

| Path                  | What                                       |
| --------------------- | ------------------------------------------ |
| `apps/playground`     | Vite app for trying the components locally |
| `apps/playground-e2e` | Playwright tests against the playground    |

## Development

Requires Node 24 and pnpm (the version is pinned in `package.json`; with Corepack or pnpm ≥ 9.7 you get it automatically).

```sh
pnpm install
pnpm nx dev @codemancers/playground          # http://localhost:4200
pnpm nx run-many -t lint test build typecheck e2e
```

## License

[MIT](LICENSE)
