import { Suspense } from "react";

import { AsyncEnvView } from "@/components/async-env-view";
import { asyncEnv } from "@/env";

/**
 * A key whose schema validates asynchronously: the asynchronous reads await
 * it, the synchronous ones refuse it. `getAsync()` makes the route dynamic,
 * as on every other page.
 */
export default async function AsyncSchemaPage() {
  const value = await asyncEnv.getAsync("ASYNC_VALUE");
  const env = await asyncEnv.getAllAsync();

  return (
    <main>
      <h1>async schema</h1>
      <p data-testid="server-async-value">{value}</p>
      <p data-testid="server-async-all">
        {`${env.ASYNC_VALUE} ${env.ASYNC_SIBLING}`}
      </p>
      <Suspense
        fallback={<p data-testid="async-fallback">waiting for the schema</p>}
      >
        <AsyncEnvView />
      </Suspense>
    </main>
  );
}
