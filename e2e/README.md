# Integration tests

Playwright against a real Next.js server: the fixture app in [`fixture/`](./fixture)
depends on the package the way an app would, and the suite drives a production
build of it.

## Three fixtures

One `playwright test` run drives all of them, each fixture behind its own
Playwright project and web server:

- [`fixture/`](./fixture) — a plain Next.js app, the full behavior matrix,
  under the `plain` project ([`tests/`](./tests), port 3210).
- [`fixture-cache/`](./fixture-cache) — the same patterns under
  `cacheComponents: true`, where every route gets a static shell and the
  publishers become dynamic holes, under the `cache` project
  ([`tests-cache/`](./tests-cache), port 3211). It has no CSP route: a
  per-request nonce cannot reach the bootstrap scripts Next bakes into the
  shell — a Next limitation.
- [`fixture-client-import/`](./fixture-client-import) — exists only to fail
  its build: it imports `next-env-space/server` from a client component, and
  the suite asserts the `server-only` marker rejects it.

## The point of two sets of values

[`env.ts`](./env.ts) holds `buildTimeEnv` and `runtimeEnv`. `next build` runs with
the first set, `next start` with the second. Every value a test asserts on is a
runtime value, so a variable that got inlined at build time fails the suite
instead of passing it quietly.

## Running

```sh
pnpm run build      # the package itself — the fixture imports dist/
pnpm run test:e2e   # rebuilds the package, builds the fixture, runs the suite
```

`playwright.config.ts` at the repo root points one `webServer` per fixture at
[`serve.ts`](./serve.ts), which builds that fixture and then starts it on its
port. The build belongs there rather than in a `globalSetup`: Playwright runs
its plugin setup — the web servers among it — before the global setups, so a
build over there would only reach the server on the next run, and every run
would silently test the build before it.

## Routes of the plain fixture

| route                   | what it covers                                            |
| ----------------------- | --------------------------------------------------------- |
| `/`                     | `getAsync()` in a Server Component, plus a client read    |
| `/client`               | the same client read after a client-side navigation       |
| `/use-env`              | `getAsync()` unwrapped with `use()` in a client component |
| `/csp`                  | the inline script under the strict CSP of `src/proxy.ts`  |
| `/unpublished`          | a space that was never sent to the browser                |
| `/unpublished/use`      | the same space read with `use()`, caught by a boundary    |
| `/render-guard`         | `get()` during a build-time prerender                     |
| `/render-guard/dynamic` | `get()` during a dynamic render                           |
| `/async-env`            | `space.getAsync()` on an otherwise static route           |
| `/module-scope`         | a module-scope read rendered into a prerender             |
| `/module-scope/dynamic` | the same module-scope value on a dynamic route            |
| `/action`               | `get()` and `getAsync()` inside a Server Action           |
| `/api/env`              | `get()` and `getAsync()` in a Route Handler               |
| `/api/broken`           | a value the schema rejects                                |
| `/api/broken-pair`      | two bad values, reported in one error                     |
| `/provided`             | a space carried by `<UseClientEnv />` context alone       |
| `/provided-late`        | the same space read after the render, which has to fail   |
| `/soft-nav`             | a client-side navigation into the layouts that publish    |
| `/guards`               | every misuse the API rejects, and how it words it         |

The routes under `(published)` sit below a layout that renders `<WithClientEnv />`;
the ones under `(bare)` do not, which is what lets `/render-guard` be prerendered
at build time, `/async-env` prove that the prerender opt-out really ran, and
`/soft-nav` reach that layout for the first time from the browser. The ones under
`(provided)` sit below two nested `<UseClientEnv />` instead, so no inline script
reaches them at all.

## Routes of the cache fixture

A leaner set of the same patterns, arranged for Cache Components: the layouts
wrap their subtree in `<Suspense>`, dynamic pages use `connection()` in place
of the segment configs the mode rejects, and the specs assert per route what
made it into the static shell and what streams in at request time —
`/client` deliberately bakes a synchronous client read into its shell to pin
down the documented capture-then-heal behavior.
