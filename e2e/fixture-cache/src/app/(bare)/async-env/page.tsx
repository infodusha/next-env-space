import { publicEnv } from "@/env";

/**
 * Nothing above this page is dynamic, so its shell is prerendered at build
 * time — `getAsync()` calls `io()` and has to keep the value out of it, as a
 * hole that is filled per request.
 */
export default async function AsyncEnvPage() {
  const appName = await publicEnv.getAsync("APP_NAME");

  return (
    <main>
      <p data-testid="app-name">{appName}</p>
    </main>
  );
}
