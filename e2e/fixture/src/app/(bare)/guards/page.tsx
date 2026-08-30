import { createEnvSpace } from "next-env-space";
import { WithClientEnv } from "next-env-space/server";
import * as z from "zod";

import { publicEnv } from "@/env";

/**
 * Every guard that rejects a misuse, run through the real runtime. The calls
 * sit inside the render on purpose: at module scope the first throw would take
 * the build down with it.
 */
export const dynamic = "force-dynamic";

export default async function GuardsPage() {
  const guards: Record<string, string> = {
    "not-an-object": message(() =>
      createEnvSpace("APP_NAME" as never, { name: "guard-string" }),
    ),
    "zod-type": message(() =>
      createEnvSpace(z.record(z.string(), z.string()) as never, {
        name: "guard-record",
      }),
    ),
    "not-a-zod-type": message(() =>
      createEnvSpace({ GUARD_VALUE: "z.string()" } as never, {
        name: "guard-value",
      }),
    ),
    "uncalled-zod-type": message(() =>
      createEnvSpace({ GUARD_VALUE: z.string } as never, {
        name: "guard-uncalled",
      }),
    ),
    "duplicate-name": message(() => {
      createEnvSpace({ GUARD_A: z.string() }, { name: "guard-duplicate" });
      createEnvSpace({ GUARD_B: z.string() }, { name: "guard-duplicate" });
    }),
    "unknown-key": message(() => publicEnv.get("NOPE" as never)),
    "missing-space": await messageAsync(() =>
      WithClientEnv({ space: undefined as never }),
    ),
  };

  return (
    <main>
      <h1>guards</h1>
      <dl>
        {Object.entries(guards).map(([name, text]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd data-testid={name}>{text}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}

function message(run: () => unknown): string {
  try {
    run();
    return "no error";
  } catch (error) {
    return describe(error);
  }
}

async function messageAsync(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "no error";
  } catch (error) {
    return describe(error);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
