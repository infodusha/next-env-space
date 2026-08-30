import { getEnvAsync } from "next-env-space/server";

import { publicEnv } from "@/env";

/** The same guarantee through the standalone form of the server entry point. */
export default async function StandaloneAsyncEnvPage() {
  const appName = await getEnvAsync(publicEnv, "APP_NAME");

  return (
    <main>
      <p data-testid="app-name">{appName}</p>
    </main>
  );
}
