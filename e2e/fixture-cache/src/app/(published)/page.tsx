import Link from "next/link";

import { PublicEnvView } from "@/components/public-env-view";
import { publicEnv } from "@/env";

export default async function HomePage() {
  const appName = await publicEnv.getAsync("APP_NAME");
  const env = await publicEnv.getAllAsync();

  return (
    <main>
      <h1 data-testid="server-app-name">{appName}</h1>
      <p data-testid="server-timeout">{env.REQUEST_TIMEOUT_SECONDS}</p>
      <p data-testid="server-feature-enabled">{String(env.FEATURE_ENABLED)}</p>
      <PublicEnvView />
      <Link href="/client">to client page</Link>
    </main>
  );
}
