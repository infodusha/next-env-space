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
there. Use `getEnvAsync` — it calls `connection()` first, which opts the route out of
prerendering:

```tsx
import { publicEnv } from "@/env";

export default async function Page() {
  const appName = await publicEnv.getEnvAsync("APP_NAME");
  return <h1>{appName}</h1>;
}
```

`getEnvAsync` lives on the space itself, in the isomorphic entry point, even though
`connection()` only exists on the server. That works through the `react-server` export
condition: the RSC layer resolves `next-env-space` to a build that awaits the real
`connection()`, every other layer gets one that awaits nothing — and never pulls
`next/server` into the browser bundle. If the condition is ever missed (for example the
package is listed in `serverExternalPackages`), `getEnvAsync` throws instead of quietly
leaving the render prerenderable.

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
- `getEnvAsync(key)` / `getAllEnvAsync()` — inside a Server Component, awaits `connection()`
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
