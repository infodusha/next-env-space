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
    GTM_ID: z.string().optional(),
    INACTIVE_TIMEOUT_SECONDS: z.coerce.number(),
    RECAPTCHA_IS_ENTERPRISE: z.stringbool({
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

## Read values

```ts
import { publicEnv } from "@/env";

// module scope, client components, route handlers, anywhere outside a render
const appName = publicEnv.getEnv("APP_NAME"); // string
const timeout = publicEnv.getEnv("INACTIVE_TIMEOUT_SECONDS"); // number
```

Inside a Server Component the value would be baked into the prerender, so `getEnv` throws
there. Use `getEnvAsync` instead — it calls `connection()` first, which opts the route out
of prerendering:

```tsx
import { getEnvAsync } from "next-env-space/server";

import { publicEnv } from "@/env";

export default async function Page() {
  const appName = await getEnvAsync(publicEnv, "APP_NAME");
  return <h1>{appName}</h1>;
}
```

## Several spaces

Every space needs its own `name` — it is the key the values are published under on the
client. Spaces are independent: each has its own schema, its own cache and its own
`WithClientEnv`.

```tsx
<WithClientEnv space={publicEnv} />
<WithClientEnv space={analyticsEnv} />
```

## API

### `createEnvSpace(schema, options?): EnvSpace`

`schema` is a shape (`{ FOO: z.string() }`) or a `z.object()` around one. Every key is parsed
with its own type, so a missing or malformed variable names itself in the error.

| option | default     | meaning                               |
| ------ | ----------- | ------------------------------------- |
| `name` | `"default"` | unique key of the space on the client |

The returned space exposes:

- `getEnv(key)` — one parsed value
- `getAllEnv()` — the whole parsed space
- `name`, `keys`, `schema`

### `next-env-space/server`

- `getEnvAsync(space, key)` — `getEnv` for Server Components, awaits `connection()` first
- `<WithClientEnv space={space} />` — ships one space to the browser

This entry point is marked `server-only`; importing it from a client component fails the
build.

## Notes

- The whole space is parsed on first read and cached for the lifetime of the process, so a
  bad value fails fast rather than at the call site that happens to need it.
- Do not use the `NEXT_PUBLIC_` prefix: those are inlined at build time, which is exactly
  what this package avoids.
- Values must be `string | undefined` on the way in — use `z.coerce.*`, `z.stringbool()` or
  `z.preprocess()` for anything else.
