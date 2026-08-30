# Integration tests

Playwright against a real Next.js server: the fixture app in [`fixture/`](./fixture)
depends on the package the way an app would, and the suite drives a production
build of it.

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

`playwright.config.ts` at the repo root points its `webServer` at
[`serve.ts`](./serve.ts), which builds the fixture and then starts it on port 3210. The build belongs there rather than in a `globalSetup`: Playwright runs
its plugin setup — the web server among it — before the global setups, so a
build over there would only reach the server on the next run, and every run
would silently test the build before it.

## Routes of the fixture

| route                   | what it covers                                            |
| ----------------------- | --------------------------------------------------------- |
| `/`                     | `getAsync()` in a Server Component, plus a client read    |
| `/client`               | the same client read after a client-side navigation       |
| `/use-env`              | `getAsync()` unwrapped with `use()` in a client component |
| `/csp`                  | the inline script under the strict CSP of `src/proxy.ts`  |
| `/unpublished`          | a space that was never sent to the browser                |
| `/render-guard`         | `get()` during a build-time prerender                     |
| `/render-guard/dynamic` | `get()` during a dynamic render                           |
| `/async-env`            | `space.getAsync()` on an otherwise static route           |
| `/api/env`              | synchronous `get()` in a Route Handler                    |
| `/api/broken`           | a value the schema rejects                                |
| `/provided`             | a space carried by `<UseClientEnv />` context alone       |
| `/provided-late`        | the same space read after the render, which has to fail   |

The routes under `(published)` sit below a layout that renders `<WithClientEnv />`;
the ones under `(bare)` do not, which is what lets `/render-guard` be prerendered
at build time and `/async-env` prove that the prerender opt-out really ran. The
ones under `(provided)` sit below two nested `<UseClientEnv />` instead, so no
inline script reaches them at all.
