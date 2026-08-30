# next-env-space

Runtime environment variables for Next.js, validated with [zod](https://zod.dev) and grouped
into isolated **spaces**.

- values are read from `process.env` **at runtime**, never inlined at build time
- one schema, one type — `getEnv("APP_NAME")` is fully typed
- several spaces per app: ship one to the browser, keep another server-only
- a guard that fails loudly when a value would be captured during a prerender

## Install

```sh
npm i next-env-space
```

`next`, `react` and `zod` are peer dependencies.

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

A `z.object()` works as well:

```ts
export const serverEnv = createEnvSpace(
  z.object({
    DATABASE_URL: z.url(),
    SESSION_SECRET: z.string().min(32),
  }),
  { name: "server" },
);
```

## Send a space to the browser

Render `WithClientEnv` once per space, in a layout above the client components that read it.
It serialises the raw values into a `<script>` tag, so **everything in that space becomes
public**. Keep secrets in a separate space that is never rendered.

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

## Read values

```ts
import { publicEnv } from "@/env";

// module scope, client components, route handlers, anywhere outside a render
const appName = publicEnv.getEnv("APP_NAME"); // string
const timeout = publicEnv.getEnv("REQUEST_TIMEOUT_SECONDS"); // number
```

Inside a Server Component the value would be baked into the prerender, so `getEnv` throws
there. Use `getEnvAsync` — it opts the render out of prerendering first:

```tsx
import { publicEnv } from "@/env";

export default async function Page() {
  const appName = await publicEnv.getEnvAsync("APP_NAME");
  return <h1>{appName}</h1>;
}
```

In a client component the same call works with `use()`:

```tsx
"use client";

import { use } from "react";

import { publicEnv } from "@/env";

export function AppName() {
  return <h1>{use(publicEnv.getEnvAsync("APP_NAME"))}</h1>;
}
```

The promise is the same one on every render of the same key, and comes back already settled
wherever there was nothing to wait for. `use()` then unwraps it on the spot, rather than
suspending on a promise the component created while rendering — which React refuses, and
says so on the console.

Without Cache Components that is every time, so the component never suspends and needs no
`<Suspense>`. With them, `getEnvAsync` is a real boundary in a client component too, so it
does — see below.

`getEnvAsync` lives on the space itself, in the isomorphic entry point, even though
`connection()` only exists on the server. That works through the `react-server` export
condition: the RSC layer resolves `next-env-space` to a build that can reach for
`connection()`, every other layer gets one that only has `io()` — and never pulls
`next/server` into the browser bundle. `io()` is a boundary in every layer, but only with
Cache Components; without them the isomorphic build has nothing to opt out with, so if the
condition is ever missed (for example the package is listed in `serverExternalPackages`)
`getEnvAsync` throws rather than quietly leaving the render prerenderable.

## Cache Components

Which API opts the render out is decided per build:

| `cacheComponents` | call           | effect                                                           |
| ----------------- | -------------- | ---------------------------------------------------------------- |
| `true`            | `io()`         | a dynamic hole in an otherwise static shell, still prefetchable  |
| `false`           | `connection()` | the route waits for a real request, which also blocks prefetches |

`io()` suspends like any other asynchronous call, so the shell around the read stays static
and the code after it can be prefetched and wrapped in `"use cache"` — which is why Next
prefers it. It only creates a dynamic boundary when Cache Components are on, though: without
them it resolves immediately during static generation and the value ends up in the build
output, so the package falls back to `connection()` there.

The detection reads the `__NEXT_CACHE_COMPONENTS` flag Next inlines into every module it
compiles. A build where the flag never reaches the package — it was externalised, for
example — reads as "off" and keeps `connection()`, which is correct in both modes, only
less eager.

With Cache Components on, both `getEnvAsync` and `<WithClientEnv />` become dynamic holes
and need a `<Suspense>` boundary around them. That is a property of the mode rather than of
`io()` — `connection()` stalls the prerender at exactly the same point, it just refuses to
resolve for anything short of a real navigation:

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

`getEnvAsync` is the way out of that, in a client component as much as in a Server one — its
`io()` turns the read into a hole of its own, so the value is produced per request and the
build fails if no boundary encloses it. What has no such escape is the synchronous
`getEnv()` and anything read at module scope: both answer during the prerender, and neither
guard sees it. Reading at module scope is fine in itself — the module is evaluated again in
the server process, so it holds the runtime value — it is rendering that value into the
static shell that captures it.

This is also why `WithClientEnv` does not open a boundary of its own. Without one the build
fails and names the route, which is the moment to place the boundary correctly; with one the
build would pass and bake the values instead.

## Several spaces

Every space needs its own `name` — it is the key the values are published under on the
client. Spaces are independent: each has its own schema, its own cache and its own
`WithClientEnv`, so a second public space is rendered next to the first:

```tsx
<WithClientEnv space={publicEnv} />
<WithClientEnv space={featureEnv} />
```

## API

### `createEnvSpace(schema, options?): EnvSpace`

`schema` is a shape (`{ FOO: z.string() }`) or a `z.object()` around one. Every key is parsed
with its own type, so a missing or malformed variable names itself in the error.

| option | default     | meaning                               |
| ------ | ----------- | ------------------------------------- |
| `name` | `"default"` | unique key of the space on the client |

The returned space exposes:

- `getEnv(key)` / `getAllEnv()` — synchronous, outside a Server Component render
- `getEnvAsync(key)` / `getAllEnvAsync()` — inside a Server Component, opts the render out
  of prerendering first; in a client component, safe to unwrap with `use()`
- `name`, `keys`, `schema`

### `next-env-space/server`

- `<WithClientEnv space={space} />` — ships one space to the browser. Takes an optional
  `nonce` for CSP
- `getEnvAsync(space, key)` — standalone form of `space.getEnvAsync(key)`, for setups where
  the `react-server` condition cannot be applied

This entry point is marked `server-only`; importing it from a client component fails the
build.

## Notes

- The whole space is parsed on first read and cached for the lifetime of the process, so a
  bad value fails fast rather than at the call site that happens to need it.
- `WithClientEnv` parses the space on the server before serialising it, so a missing or
  malformed value fails there rather than in the browser at the first read.
- Do not use the `NEXT_PUBLIC_` prefix: those are inlined at build time, which is exactly
  what this package avoids.
- Values must be `string | undefined` on the way in — use `z.coerce.*`, `z.stringbool()` or
  `z.preprocess()` for anything else.
