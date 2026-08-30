import { publicEnv } from "@/env";

/** `getEnv()` inside a Server Component render has to be rejected. */
export default function RenderGuardPage() {
  let message = "no error";

  try {
    publicEnv.getEnv("APP_NAME");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  return (
    <main>
      <pre data-testid="message">{message}</pre>
    </main>
  );
}
