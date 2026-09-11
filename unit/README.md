# Unit tests

Node's own test runner, against the built package: `dist/` is what an app
installs, and it is also the only form Node can load — the sources import each
other by `.js` specifier, which nothing resolves back to `.ts` without a build.

```sh
pnpm run test:unit   # builds, then runs every unit/**/*.test.ts
```

The runner preloads `next/dist/server/node-environment-baseline.js`, the file
Next itself loads first on a server: it puts `AsyncLocalStorage` on
`globalThis`, without which the work stores the guards read throw on `run()`.
Tests enter a Next context by running under those real stores with a minimal
fake store object — see [`helpers/work-stores.ts`](./helpers/work-stores.ts).

Each file is its own process, so a file may set `NODE_ENV=production` before it
imports the package, or define `window` and `document` for the browser paths,
without touching the others. What needs a real React render — the Flight-render
branch of the guard, `use()` in a component, the publishers — stays with the
e2e suite in [`../e2e`](../e2e).
