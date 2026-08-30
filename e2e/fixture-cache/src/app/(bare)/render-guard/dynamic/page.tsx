import { connection } from "next/server";

import { publicEnv } from "@/env";

/**
 * The same guard, but in a render that is dynamic from the start —
 * `connection()`, since a route segment config would not survive Cache
 * Components.
 */
export default async function DynamicRenderGuardPage() {
  await connection();

  let message = "no error";

  try {
    publicEnv.get("APP_NAME");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  return (
    <main>
      <pre data-testid="message">{message}</pre>
    </main>
  );
}
