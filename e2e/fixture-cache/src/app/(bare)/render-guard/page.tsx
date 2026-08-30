import { publicEnv } from "@/env";

/** `get()` inside a Server Component render has to be rejected. */
export default function RenderGuardPage() {
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
