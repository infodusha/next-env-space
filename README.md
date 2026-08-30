# next-env-space

Runtime environment variables for Next.js, validated with any
[Standard Schema](https://standardschema.dev) library — zod, valibot, arktype and the rest —
and grouped into isolated **spaces**.

- values are read from `process.env` **at runtime**, never inlined at build time
- one schema per key, one type — `get("APP_NAME")` is fully typed
- bring your own schema library: anything that implements Standard Schema plugs in
- several spaces per app: ship one to the browser, keep another server-only
- a guard that fails loudly when a value would be captured during a prerender

## Install

```sh
npm i next-env-space
```

`next` and `react` are peer dependencies. The schema library is yours to pick — every
example below uses [zod](https://zod.dev), but any
[Standard Schema](https://standardschema.dev) implementation works the same way.

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

## Send a space to the browser

Render `WithClientEnv` once per space, in a layout above the client components that read it.
It serialises the raw values into a `<script>` tag, so **everything in that space becomes
public**. Keep secrets in a separate space that is never rendered.

It has to sit **above** the components that read it, not merely before them: a layout that a
client-side navigation mounts has no document left to write a script into, and the values
reach the browser as `WithClientEnv` itself renders there.

There is a second publisher, `UseClientEnv`, that carries the space in React context instead
of a script — [see below](#without-the-inline-script) for what that trades away.

```tsx
// app/layout.tsx
import { WithClientEnv } from "next-env-space/server";

import { publicEnv } from "@/env";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WithClientEnv space={publicEnv} />
        {children}
      </body>
    </html>
  );
}
```

### Content Security Policy

The values are shipped in an inline `<script>`, so a policy like `script-src 'nonce-...'`
blocks it and the space never reaches the browser. Pass the nonce to `WithClientEnv` and it
goes on the tag:

```tsx
import { headers } from "next/headers";

const nonce = (await headers()).get("x-nonce") ?? undefined;

<WithClientEnv space={publicEnv} nonce={nonce} />;
```

Do not reach for `'unsafe-inline'` to make the script run.

A per-request nonce needs every script of the page to carry it, and that does
not combine with `cacheComponents`: the static shell is built before any
request, so Next bakes its own bootstrap scripts into it without a nonce and
the browser blocks them — a
[Next limitation](https://nextjs.org/docs/app/guides/content-security-policy),
not something `WithClientEnv` can route around. The env script itself streams
with the nonce of the request either way. Under `cacheComponents`, prefer a
hash-based policy or `UseClientEnv`.

### Without the inline script

`UseClientEnv` publishes the same space through React context instead. Nothing is written
into the document, so there is no nonce to pass and no `script-src` to widen — but it wraps
the tree rather than sitting next to it:

```tsx
// app/layout.tsx
import { UseClientEnv } from "next-env-space/server";

import { publicEnv } from "@/env";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UseClientEnv space={publicEnv}>{children}</UseClientEnv>
      </body>
    </html>
  );
}
```

Providers nest, so a second space wraps the first:

```tsx
<UseClientEnv space={publicEnv}>
  <UseClientEnv space={featureEnv}>{children}</UseClientEnv>
</UseClientEnv>
```

What it costs is every read that does not happen while a component renders — context is
only readable from a render. With `UseClientEnv` alone:

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

This is the only read `<UseClientEnv />` on its own can serve. Everything else in this
section needs the space published with `<WithClientEnv />`.

## Cache Components

With `cacheComponents` on, `getAsync`, `<WithClientEnv />` and `<UseClientEnv />` all become
dynamic holes and need a `<Suspense>` boundary around them:

```tsx
<body>
  <Suspense fallback={null}>
    <WithClientEnv space={publicEnv} />
    {children}
  </Suspense>
</body>
```

Put that boundary **above everything that reads the space**, not tightly around
`WithClientEnv` — the readers have to be inside it too. Whatever stays outside belongs to
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
`WithClientEnv`, so a second public space is rendered next to the first:

```tsx
<WithClientEnv space={publicEnv} />
<WithClientEnv space={featureEnv} />
```

`<UseClientEnv />` nests instead of repeating, and merges with the provider above it.

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

### `next-env-space/server`

- `<WithClientEnv space={space} />` — ships one space to the browser in an inline
  `<script>`, before any client module is evaluated, or from the browser itself when a
  client-side navigation is what mounts it. Takes an optional `nonce` for CSP. Serves every
  read, `get()` included
- `<UseClientEnv space={space}>{children}</UseClientEnv>` — ships the same space through
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
- Schemas have to validate synchronously: the values are parsed on the spot, so a key with
  an async refinement throws on its first read.
- Two spaces under one `name` overwrite each other on the client. That warns, and in
  production, where a rebuild rather than a hot reload is what re-evaluates a module, it
  throws as soon as their keys differ.
- `WithClientEnv` parses the space on the server before serialising it, so a missing or
  malformed value fails there rather than in the browser at the first read.
- Do not use the `NEXT_PUBLIC_` prefix: those are inlined at build time, which is exactly
  what this package avoids.
- Values must be `string | undefined` on the way in — use `z.coerce.*`, `z.stringbool()`,
  `z.preprocess()`, or what your library offers for the same, for anything else.
