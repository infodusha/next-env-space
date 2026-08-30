# next-env-space

Runtime environment variables for Next.js, validated with [zod](https://zod.dev) and grouped
into isolated **spaces**.

- values are read from `process.env` **at runtime**, never inlined at build time
- one schema, one type — `get("APP_NAME")` is fully typed
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

## Cache Components

With `cacheComponents` on, both `getAsync` and `<WithClientEnv />` become dynamic holes and
need a `<Suspense>` boundary around them:

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

## API

### `createEnvSpace(schema, options?): EnvSpace`

`schema` is a shape (`{ FOO: z.string() }`) or a `z.object()` around one. Every key is parsed
with its own type, so a missing or malformed variable names itself in the error.

| option | default     | meaning                               |
| ------ | ----------- | ------------------------------------- |
| `name` | `"default"` | unique key of the space on the client |

The returned space exposes:

- `get(key)` / `getAll()` — synchronous, outside a Server Component render
- `getAsync(key)` / `getAllAsync()` — inside a Server Component, opts the render out
  of prerendering first; in a client component, safe to unwrap with `use()`
- `name`, `keys`, `schema`

### `next-env-space/server`

- `<WithClientEnv space={space} />` — ships one space to the browser. Takes an optional
  `nonce` for CSP

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
