import { createEnvSpace } from "next-env-space";
import * as z from "zod";

import { publicEnv } from "@/env";

/**
 * Every guard that rejects a misuse, run through the real runtime. The calls
 * sit inside the render on purpose: at module scope the first throw would take
 * the build down with it.
 */
export const dynamic = "force-dynamic";

export default function GuardsPage() {
  const guards: Record<string, string> = {
    "async-schema": message(() =>
      createEnvSpace(
        { APP_NAME: z.string().refine(() => Promise.resolve(true)) },
        { name: "guard-async" },
      ).get("APP_NAME"),
    ),
    "async-schema-all": message(() =>
      createEnvSpace(
        {
          APP_NAME: z.string().refine(() => Promise.resolve(true)),
          FEATURE_LABEL: z.string().refine(() => Promise.resolve(true)),
        },
        { name: "guard-async-all" },
      ).getAll(),
    ),
    "duplicate-name": message(() => {
      createEnvSpace({ GUARD_A: z.string() }, { name: "guard-duplicate" });
      createEnvSpace({ GUARD_B: z.string() }, { name: "guard-duplicate" });
    }),
    "unknown-key": message(() => publicEnv.get("NOPE" as never)),
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

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
