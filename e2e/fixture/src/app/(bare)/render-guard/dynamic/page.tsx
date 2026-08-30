import { publicEnv } from "@/env";

/** The same guard, but in a render that is dynamic from the start. */
export const dynamic = "force-dynamic";

export default function DynamicRenderGuardPage() {
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
