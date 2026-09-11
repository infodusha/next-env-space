import { publicEnv } from "@/env";

/**
 * The same read in a render that is dynamic from the start: nothing captures
 * the value there, so the guard lets it through with the runtime value.
 */
export const dynamic = "force-dynamic";

export default function DynamicRenderGuardPage() {
  let message: string;

  try {
    message = `ok:${publicEnv.get("APP_NAME")}`;
  } catch (error) {
    message = `err:${error instanceof Error ? error.message : String(error)}`;
  }

  return (
    <main>
      <pre data-testid="message">{message}</pre>
    </main>
  );
}
