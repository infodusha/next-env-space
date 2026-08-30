# next-env-space

[![npm](https://img.shields.io/npm/v/next-env-space)](https://www.npmjs.com/package/next-env-space)
[![ci](https://github.com/infodusha/next-env-space/actions/workflows/ci.yml/badge.svg)](https://github.com/infodusha/next-env-space/actions/workflows/ci.yml)

Runtime environment variables for Next.js, validated with any
[Standard Schema](https://standardschema.dev) library — zod, valibot, arktype and the rest —
and grouped into isolated **spaces**.

- values are read from `process.env` **at runtime**, never inlined at build time
- one schema per key, one type — `get("APP_NAME")` is fully typed
- bring your own schema library: anything that implements Standard Schema plugs in
- several spaces per app: ship one to the browser, keep another server-only
- a guard that fails loudly when a value would be captured during a prerender

## Why

`NEXT_PUBLIC_*` variables are inlined into the bundle by `next build`, so one image serves
one environment, and a value that changes means a rebuild. Libraries that validate `env` at
build time — [t3-env](https://env.t3.gg) among them — inherit that for the client side; the
ones that ship values at runtime tend to hand back an untyped `string | undefined`. This
package does both: the values are read from `process.env` when the server runs, so one build
goes to every environment, and each one is parsed by the schema you gave it, so `get()`
returns a `number` where you declared one.

## Install

```sh
npm i next-env-space
```

Needs Next.js 16.3 or later and React 19.2 or later, both peer dependencies. The package is
ESM only.

The schema library is yours to pick — every example below uses [zod](https://zod.dev), but
any [Standard Schema](https://standardschema.dev) implementation works the same way.

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

Another library plugs in the same way — [valibot](https://valibot.dev) here — and keys from
different libraries may share one shape:

```ts
import * as v from "valibot";

export const serverEnv = createEnvSpace(
  {
    DATABASE_URL: v.pipe(v.string(), v.url()),
    SESSION_SECRET: v.pipe(v.string(), v.minLength(32)),
  },
  { name: "server" },
);
```

The schema is always a shape with one schema per key. A single object schema around the keys —
`z.object({ ... })`, `v.object({ ... })` — does not type-check: Standard Schema does not expose
the keys an object declares, and every variable is parsed on its own so a bad one can name itself.

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
async refinement throws on its first read.

## Send a space to the browser

Render `ClientEnvScript` once per space, in a layout above the client components that read it.
It serialises the raw values into a `<script>` tag, so **everything in that space becomes
public**. Keep secrets in a separate space that is never rendered.

It has to sit **above** the components that read it, not merely before them: a layout that a
client-side navigation mounts has no document left to write a script into, and the values
reach the browser as `ClientEnvScript` itself renders there.

There is a second publisher, `ClientEnvProvider`, that carries the space in React context instead
of a script — [see below](#without-the-inline-script) for what that trades away.

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

### Content Security Policy

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

`ClientEnvProvider` publishes the same space through React context instead. Nothing is written
into the document, so there is no nonce to pass and no `script-src` to widen — but it wraps
the tree rather than sitting next to it:

```tsx
// app/layout.tsx
import { ClientEnvProvider } from "next-env-space/server";

import { publicEnv } from "@/env";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientEnvProvider space={publicEnv}>{children}</ClientEnvProvider>
      </body>
    </html>
  );
}
```

Providers nest, so a second space wraps the first:

```tsx
<ClientEnvProvider space={publicEnv}>
  <ClientEnvProvider space={featureEnv}>{children}</ClientEnvProvider>
</ClientEnvProvider>
```

What it costs is every read that does not happen while a component renders — context is
only readable from a render. With `ClientEnvProvider` alone:

- `get()` and `getAll()` throw in the browser; they never look at the context
- `getAsync()` and `getAllAsync()` work inside a client component, and throw from an event
  handler, an effect, or any other code that runs after the render
- a read at module scope throws, for the same reason

Nothing changes on the server, where the values come straight from `process.env`. Rendering
both components is fine as well: the script answers first and the context is left unread.

## Read values

```ts
import { publicEnv } from "@/env";

// module scope, client components, route handlers, anywhere outside a render
const appName = publicEnv.get("APP_NAME"); // string
const timeout = publicEnv.get("REQUEST_TIMEOUT_SECONDS"); // number
```

Inside a Server Component the value would be baked into the prerender, so `get` throws
there. Use `getAsync` — it opts the render out of prerendering first:

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

This is the only read `<ClientEnvProvider />` on its own can serve. Everything else in this
section needs the space published with `<ClientEnvScript />`.

### Where each read works

In the table, _the script_ is `<ClientEnvScript />` and _the provider_ is `<ClientEnvProvider />`.

| where                                                  | `get()`                            | `getAsync()`                                                     |
| ------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------- |
| Server Component render, `generateMetadata`            | ❌ throws                          | ✅ works, opts the route out of prerendering                     |
| Client Component render                                | ⚙️ works with the script           | ⚙️ works with the provider or the script, unwrapped with `use()` |
| Client Component, outside the render (handler, effect) | ⚙️ works with the script           | ⚙️ works with the script                                         |
| module scope of a client module                        | ⚙️ works with the script           | ⚙️ works with the script                                         |
| module scope of a server module                        | ✅ works                           | 🚫 do not `await` at module scope                                |
| Route Handler                                          | ✅ works                           | ✅ works                                                         |
| Route Handler with `dynamic = "force-static"`          | ⚠️ **build-time value**, silently  | ⚠️ **build-time value**, silently                                |
| Server Action                                          | ✅ works                           | ✅ works                                                         |
| `proxy.ts` (middleware)                                | ✅ works                           | ✅ works                                                         |
| `instrumentation.ts` — `register()`                    | ✅ works                           | ❌ throws: Next has no request to attach to                      |
| `instrumentation-client.ts`                            | ⚙️ works with the script           | ⚙️ works with the script                                         |
| `generateStaticParams`                                 | build-time value — that is its job | ❌ throws: Next has no request to attach to                      |
| inside a `"use cache"` function                        | ❌ throws                          | ⚠️ **build-time value**, cached                                  |

`instrumentation-client.ts` runs once, as the first page loads, before any component: it
sees a space only if that page writes the env script of `<ClientEnvScript />` — a root layout
does — and never the context of `<ClientEnvProvider />`, which has not rendered yet.

The 🚫 cell is neither ❌ nor ⚠️ because the outcome depends on when the module happens to
be evaluated first. Inside a request the `await` resolves with the runtime value — which the
synchronous `get()` in the next column already gives, without the gamble. During the build,
or anywhere without a request, the opt-out has nothing to attach to and rejects — and a
module whose top-level `await` rejects stays broken for every later import of it. Nothing to
gain when it works, a poisoned module when it does not: use `get()`.

The two bold rows are the ones no guard can catch. A `force-static` Route Handler is
prerendered once at build, and `"use cache"` caches whatever its body returned the first
time it ran — during `next build`. Neither read throws there, so both bake the value of
the build machine in. Read the value outside and pass it in as an argument, or drop the
static mode for that route.

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
the static shell and is rendered during `next build`, where a read still answers, with the
build machine's value: it then sits in the prerendered HTML and mismatches the runtime value
on hydration.

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

`<ClientEnvProvider />` nests instead of repeating, and merges with the provider above it.

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

`register()` runs outside any request, so this is `getAll()` — `getAllAsync()` throws there.

### One build, many environments

Nothing in the package needs the real values at `next build`: the publishers and `getAsync`
opt out of prerendering, so a `Dockerfile` can build the app without a single variable set
and let `docker run -e` or the orchestrator supply them to `next start`. The exceptions are
the reads that run at build time by nature — module scope of a module the build evaluates,
`generateStaticParams`, the bold rows of the table above. Those see whatever the build
machine has, and a required key that is missing there fails the build, which is the right
call: the value would have been baked in otherwise. `output: "standalone"` changes nothing,
`node server.js` reads the same `process.env`.

### Testing

The space caches its parsed values for the lifetime of the process and reads `process.env`
when a module first touches it. In a unit test, set the variables first and import the module
under test afterwards — `vi.resetModules()` between cases gives every set of values a fresh
space. Under a browser-like environment (`jsdom`, `happy-dom`) `window` exists, so the space
looks for the values `<ClientEnvScript />` publishes and finds none: run the tests of
server-side code in the `node` environment.

## API

### `createEnvSpace(schema, options?): EnvSpace`

`schema` is a shape with one [Standard Schema](https://standardschema.dev) per key
(`{ FOO: z.string() }`), from any library that implements the spec. Every key is parsed with
its own schema, so a missing or malformed variable names itself in the error.

| option | default     | meaning                               |
| ------ | ----------- | ------------------------------------- |
| `name` | `"default"` | unique key of the space on the client |

The returned space exposes:

- `get(key)` / `getAll()` — synchronous, outside a Server Component render
- `getAsync(key)` / `getAllAsync()` — inside a Server Component, opts the render out
  of prerendering first; in a client component, safe to unwrap with `use()`
- `name`, `keys`, `schema`

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

- `<ClientEnvScript space={space} />` — ships one space to the browser in an inline
  `<script>`, before any client module is evaluated, or from the browser itself when a
  client-side navigation is what mounts it. Takes an optional `nonce` for CSP. Serves every
  read, `get()` included
- `<ClientEnvProvider space={space}>{children}</ClientEnvProvider>` — ships the same space through
  React context. No inline script and no nonce, but only `getAsync()` / `getAllAsync()`
  can read it, and only from a component below it

This entry point is marked `server-only`; importing it from a client component fails the
build.

## Notes

- The whole space is parsed on first read and cached for the lifetime of the process, so a
  bad value fails fast rather than at the call site that happens to need it — and the error
  names every bad value at once, not one per restart.
- A key the space does not declare throws in `get()` and `getAsync()` rather than reading as
  `undefined`.
- Two spaces under one `name` overwrite each other on the client. That is harmless while
  they declare the same keys — a hot reload re-creates a space this way — and an error as
  soon as they do not: a warning in development, a thrown error in production.
- `ClientEnvScript` parses the space on the server before serialising it, so a missing or
  malformed value fails there rather than in the browser at the first read.
- Do not use the `NEXT_PUBLIC_` prefix: those are inlined at build time, which is exactly
  what this package avoids.
