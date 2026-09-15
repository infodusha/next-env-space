# next-env-space

[![npm](https://img.shields.io/npm/v/next-env-space)](https://www.npmjs.com/package/next-env-space)
[![ci](https://github.com/infodusha/next-env-space/actions/workflows/ci.yml/badge.svg)](https://github.com/infodusha/next-env-space/actions/workflows/ci.yml)

Runtime environment variables for Next.js, validated with any
[Standard Schema](https://standardschema.dev) library — zod, valibot, arktype and the rest —
and grouped into isolated **spaces**.

- values are read from `process.env` **at runtime**, never inlined at build time
- one schema per key, one type — `get("APP_NAME")` is fully typed
- several spaces per app: ship one to the browser, keep another server-only
- a guard that fails loudly when a value would be baked in at build time

## Why

`NEXT_PUBLIC_*` variables are inlined into the bundle by `next build`, so one image serves
one environment, and a value that changes means a rebuild. Libraries that validate `env` at
build time — [t3-env](https://env.t3.gg) among them — inherit that for the client side; the
ones that ship values at runtime tend to hand back an untyped `string | undefined`. This
package does both: runtime values, each parsed by the schema you declared.

## Install

```sh
npm i next-env-space
```

Needs Next.js 16.3 or later and React 19.2 or later, both peer dependencies. The package is
ESM only. The schema library is yours to pick — every example below uses
[zod](https://zod.dev), but any [Standard Schema](https://standardschema.dev)
implementation works the same way.

## Define a space

```ts
import * as z from "zod";
import { createEnvSpace } from "next-env-space";

export const publicEnv = createEnvSpace(
  {
    APP_NAME: z.string(),
    APP_VERSION: z.string().optional(),
    REQUEST_TIMEOUT_SECONDS: z.coerce.number(),
    FEATURE_ENABLED: z.stringbool({
      truthy: ["TRUE"],
      falsy: ["FALSE"],
    }),
  },
  { name: "public" },
);
```

The schema is always a shape with one schema per key — keys from different libraries may
even share one shape. A single object schema around the keys — `z.object({ ... })`,
`v.object({ ... })` — does not type-check: Standard Schema does not expose the keys an
object declares, and every variable is parsed on its own so a bad one can name itself.

### Anything that is not a string

Every value arrives as `string | undefined`, so the schema is where it turns into something
else — coercion, a default, a boolean, a parsed JSON document:

```ts
export const publicEnv = createEnvSpace(
  {
    PORT: z.coerce.number().default(3000),
    DEBUG: z.stringbool().default(false),
    SERVICE_URLS: z.preprocess(
      (raw) => JSON.parse(raw as string) as unknown,
      z.record(z.string(), z.url()),
    ),
  },
  { name: "public" },
);

publicEnv.get("SERVICE_URLS"); // Record<string, string>
```

Schemas have to validate synchronously: the values are parsed on the spot, so a key with an
async refinement fails on its first read.

## Send a space to the browser

Two publishers ship a space to the browser. Whichever one you render, **everything in that
space becomes public** — keep secrets in a separate space that is never rendered.

### With an inline script

Render `ClientEnvScript` once per space, in a layout **above** the client components that
read it — above, not merely before them: a layout that a client-side navigation mounts has
no document left to write a script into, so there the values travel with
`ClientEnvScript`'s own render. It serialises the raw values into a `<script>` tag that
runs before any client module is evaluated, so it serves every read — `get()` at module
scope included.

```tsx
// app/layout.tsx
import { ClientEnvScript } from "next-env-space/server";

import { publicEnv } from "@/env";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientEnvScript space={publicEnv} />
        {children}
      </body>
    </html>
  );
}
```

#### Content Security Policy

The values are shipped in an inline `<script>`, so a policy like `script-src 'nonce-...'`
blocks it and the space never reaches the browser. Pass the nonce to `ClientEnvScript` and it
goes on the tag:

```tsx
import { headers } from "next/headers";

const nonce = (await headers()).get("x-nonce") ?? undefined;

<ClientEnvScript space={publicEnv} nonce={nonce} />;
```

Do not reach for `'unsafe-inline'` to make the script run.

A per-request nonce needs every script of the page to carry it, and that does
not combine with `cacheComponents`: the static shell is built before any
request, so Next bakes its own bootstrap scripts into it without a nonce and
the browser blocks them — a
[Next limitation](https://nextjs.org/docs/app/guides/content-security-policy),
not something `ClientEnvScript` can route around. The env script itself streams
with the nonce of the request either way. Under `cacheComponents`, prefer a
hash-based policy or `ClientEnvProvider`.

### Without the inline script

`ClientEnvProvider` publishes the same space through React context, wrapping the tree
rather than sitting next to it. Nothing is written into the document, so there is no nonce
to pass and no `script-src` to widen — but context is only readable while a component
renders, so in the browser the only reads it serves are
`getAsync()` / `getAllAsync()` called during a client component render
([the table below](#where-each-read-works) has the full picture). Nothing changes on the
server, and rendering both publishers is fine: the script answers first and the context is
left unread.

```tsx
// app/layout.tsx
import { ClientEnvProvider } from "next-env-space/server";

<body>
  <ClientEnvProvider space={publicEnv}>{children}</ClientEnvProvider>
</body>;
```

## Read values

```ts
import { publicEnv } from "@/env";

// module scope, client components, route handlers, anywhere outside a render
const appName = publicEnv.get("APP_NAME"); // string
const timeout = publicEnv.get("REQUEST_TIMEOUT_SECONDS"); // number
```

Inside a Server Component the value would be baked into the build output, so `get` throws
while `next build` prerenders the route — and, in development, while Cache Components runs
the prerender that stands in for the build. Every render the running server does — a
dynamic request, an ISR revalidation, a runtime prefetch, a static shell it regenerates —
reads that server's environment, and there `get` answers the runtime value. Use `getAsync`
all the same — it opts the render out of prerendering first, so the same code survives the
route turning static:

```tsx
import { publicEnv } from "@/env";

export default async function Page() {
  const appName = await publicEnv.getAsync("APP_NAME");
  return <h1>{appName}</h1>;
}
```

In a client component the same call works with `use()`:

```tsx
"use client";

import { use } from "react";

import { publicEnv } from "@/env";

export function AppName() {
  return <h1>{use(publicEnv.getAsync("APP_NAME"))}</h1>;
}
```

### Where each read works

In the table, _the script_ is `<ClientEnvScript />` and _the provider_ is `<ClientEnvProvider />`.

| where                                                        | `get()`                                 | `getAsync()`                                                     |
| ------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------- |
| Server Component render, `generateMetadata`                  | ❌ throws at build time                 | ✅ works                                                         |
| Client Component render                                      | ⚙️ works with the script                | ⚙️ works with the provider or the script, unwrapped with `use()` |
| Client Component, outside the render (handler, effect)       | ⚙️ works with the script                | ⚙️ works with the script                                         |
| module scope of a client module                              | ⚙️ works with the script                | ⚙️ works with the script                                         |
| module scope of a server module                              | ✅ works                                | ✅ works                                                         |
| Route Handler, metadata route (`robots.ts`, `sitemap.ts`, …) | ❌ throws where the build prerenders it | ✅ works                                                         |
| Route Handler with `dynamic = "force-static"` or `"error"`   | ❌ throws at build time                 | ❌ throws at build time                                          |
| Server Action                                                | ✅ works                                | ✅ works                                                         |
| `proxy.ts` (middleware)                                      | ✅ works                                | ✅ works                                                         |
| `instrumentation.ts` — `register()`                          | ✅ works                                | ✅ works                                                         |
| `instrumentation-client.ts`                                  | ⚙️ works with the script                | ⚙️ works with the script                                         |
| `generateStaticParams`                                       | ❌ throws: it only runs at build        | ❌ throws: it only runs at build                                 |
| inside a `"use cache"` function                              | ❌ throws at build time                 | ❌ throws at build time                                          |

`next build` evaluates the module scope of every page, layout and Route Handler while it
collects their config, and a static prerender evaluates whatever it imports. Nothing is parsed
there: a read the guards let through answers `undefined` during the build, and the running
server, which evaluates every module again, parses the space on its first read.
[One build, many environments](#one-build-many-environments) has what follows from that.

A module that Next imports lazily inside a render — a dynamic `import()` in a Server
Component, or a page module that an older Next only reached while resolving metadata for a
prefetch — runs its module scope inside that render, where React cannot tell a module-scope
read from one in a component body. That is why the guard rejects a read only where the
build output is being written: on the running server the module-scope read goes through
with the runtime value, during `next build` it still throws. A module the build has to
evaluate is better imported statically.

Three more places let the build capture a value without a React render to opt out of, and
the guard throws there, naming the place. `generateStaticParams` only ever runs at build, so
its reads could only see the build machine — compute the params without them; both reads
throw. A cached function — `"use cache"`, `unstable_cache()` — runs at build to fill the
cache, and whatever it reads is served long after: read the value outside and pass it in as
an argument; both reads throw. A Route Handler that reads no request data is prerendered
into a static response the same way, and so are the metadata routes — `/favicon.ico`,
`/manifest.*`, `/robots.txt`, `/sitemap.xml` — so `get()` throws there, while `getAsync()`
calls `connection()` and turns the route dynamic, like in a Server Component. Only
`dynamic = "force-static"` or `"error"` makes `getAsync()` throw as well: the first turns
`connection()` into a no-op, the second forbids it, so the value really would be captured.
A read that seems to come from nowhere may sit at the module scope of a module the handler
imports lazily, which runs inside the prerender. The same cached function or Route Handler
run by the server — a cache miss, an ISR revalidation — reads the runtime value and is left
alone, like every render the running server does.

A read at module scope of `instrumentation-client.ts` runs before Next boots the page, so a
throw there stops the boot and hides every error Next would otherwise show, this one included:
a blank page and a console message are all that is left. On a page that does not publish the
space that is what happens — catch the read there, or read where the value is used. On the
error document Next serves when a server render fails, `get()` and `getAll()` answer
`undefined` instead and report the missing space once the page has booted, so that Next gets
to show the failure that caused it; `getAsync()` rejects as usual.

## Cache Components

With `cacheComponents` on, `getAsync`, `<ClientEnvScript />` and `<ClientEnvProvider />` all become
dynamic holes and need a `<Suspense>` boundary around them:

```tsx
<body>
  <Suspense fallback={null}>
    <ClientEnvScript space={publicEnv} />
    {children}
  </Suspense>
</body>
```

Put that boundary **above everything that reads the space**, not tightly around
`ClientEnvScript` — the readers have to be inside it too. Whatever stays outside belongs to
the static shell and is rendered during `next build`, where a read still answers, with
`undefined` — the build parses nothing: an empty spot then sits in the prerendered HTML and
mismatches the runtime value on hydration.

`getAsync` is the way out of that, in a client component as much as in a Server one — the
value is produced per request and the build fails if no boundary encloses it. What has no
such escape is the synchronous `get()` and anything read at module scope: both answer during
the prerender, and neither guard sees it. Reading at module scope is fine in itself — the
module is evaluated again in the server process, so it holds the runtime value — it is
rendering that value into the static shell that captures it.

## Several spaces

Every space needs its own `name` — it is the key the values are published under on the
client. Spaces are independent: each has its own schema, its own cache and its own
`ClientEnvScript`, so a second public space is rendered next to the first:

```tsx
<ClientEnvScript space={publicEnv} />
<ClientEnvScript space={featureEnv} />
```

`<ClientEnvProvider />` nests instead of repeating, and merges with the provider above it:

```tsx
<ClientEnvProvider space={publicEnv}>
  <ClientEnvProvider space={featureEnv}>{children}</ClientEnvProvider>
</ClientEnvProvider>
```

## Recipes

### Fail at boot, not on the first request

A space is parsed on its first read, so a misconfigured variable surfaces when the first
request happens to need it. Read every space once as the server starts and a bad
deployment dies right there:

```ts
// instrumentation.ts
import { publicEnv } from "@/env";
import { serverEnv } from "@/env.server";

export function register() {
  publicEnv.getAll();
  serverEnv.getAll();
}
```

`register()` runs outside any request; `getAllAsync()` answers there too, with the same
values — there is just nothing to `await`, so the synchronous read says it straighter.

### One build, many environments

Nothing in the package needs the real values at `next build`, and nothing is parsed there.
The publishers and `getAsync` opt out of prerendering; a read the build reaches all the same
— the module scope of a page it evaluates to collect the page's config, a client component it
prerenders — answers `undefined` and leaves the schema alone. So a `Dockerfile` can build the
app without a single variable set and let `docker run -e` or the orchestrator supply them to
`next start`, where the first read parses the space. That `undefined` is what a module-scope
read holds while the build evaluates the module, so store it, do not compute with it:
`new URL(publicEnv.get("API_URL"))` at module scope throws on it during the build — derive
where the value is used. Every other read the build reaches — a Server Component,
`generateStaticParams`, a cached function, `get()` in a prerendered Route Handler — throws right there
instead of capturing. `output: "standalone"` changes nothing, `node server.js` reads the same
`process.env`.

### Testing

A space reads `process.env` when a module first touches it and caches the result. In a unit
test, set the variables first and import the module under test afterwards —
`vi.resetModules()` between cases gives every set of values a fresh space. Under a
browser-like environment (`jsdom`, `happy-dom`) `window` exists, so the space looks for the
values `<ClientEnvScript />` publishes and finds none: run the tests of server-side code in
the `node` environment.

## API

### `createEnvSpace(schema, options?): EnvSpace`

`schema` is a shape with one [Standard Schema](https://standardschema.dev) per key
(`{ FOO: z.string() }`), from any library that implements the spec.

| option | default     | meaning                               |
| ------ | ----------- | ------------------------------------- |
| `name` | `"default"` | unique key of the space on the client |

The returned space exposes:

- `get(key)` / `getAll()` — synchronous reads
- `getAsync(key)` / `getAllAsync()` — asynchronous reads, the only ones that work inside a
  Server Component render; in a client component, safe to unwrap with `use()`
- `name`, `keys`, `schema`

[Where each read works](#where-each-read-works) maps both onto every calling context.

### `InferEnv<typeof space>`

The parsed values of a space as one read-only object type, for the places that carry the
whole environment around rather than one key:

```ts
import type { InferEnv } from "next-env-space";

type PublicEnv = InferEnv<typeof publicEnv>;
type Timeout = PublicEnv["REQUEST_TIMEOUT_SECONDS"]; // number
```

The shape itself works as well — `InferEnv<typeof publicEnv.schema>` names the same type.

### `next-env-space/server`

- `<ClientEnvScript space={space} />` — publishes one space in an inline `<script>`; takes
  an optional `nonce` for CSP
- `<ClientEnvProvider space={space}>{children}</ClientEnvProvider>` — publishes it through
  React context instead

This entry point is marked `server-only`; importing it from a client component fails the
build.

## Notes

- The whole space is parsed on the first read the running server does — `next build` parses
  nothing — and cached for the lifetime of the process, so a bad value fails fast rather than
  at the call site that happens to need it — and the error names every bad value at once, not
  one per restart.
- A key the space does not declare throws in `get()` and rejects in `getAsync()` rather than
  reading as `undefined`.
- Two spaces under one `name` overwrite each other on the client. That is harmless while
  they declare the same keys — a hot reload re-creates a space this way — and an error as
  soon as they do not: a warning in development, a thrown error in production.
- `ClientEnvScript` parses the space on the server before serialising it, so a missing or
  malformed value fails the render there rather than in the browser at the first read. The
  raw values still reach the browser, ahead of the failure, so a read there fails on the same
  message instead of reporting the space missing.
- Do not use the `NEXT_PUBLIC_` prefix: those are inlined at build time, which is exactly
  what this package avoids.
