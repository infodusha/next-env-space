import { publicEnv } from "@/env";

/**
 * Nothing above this page is dynamic, so it would be prerendered at build time
 * if `getAsync()` did not call the real `connection()` first. That only
 * happens when the package is resolved through the `react-server` condition,
 * which is what makes the runtime value below the interesting part.
 */
export default async function AsyncEnvPage() {
  const appName = await publicEnv.getAsync("APP_NAME");

  return (
    <main>
      <p data-testid="app-name">{appName}</p>
    </main>
  );
}
