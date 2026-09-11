import { ClientEnvScript } from "next-env-space/server";

import { brokenPublicEnv } from "@/env";

/**
 * Publishes a space the schema rejects at runtime. The render fails on the
 * server, as it should, but the raw values have to reach the browser first —
 * `(broken)/error.tsx` above this segment is what the browser then shows.
 */
export default function BrokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientEnvScript space={brokenPublicEnv} />
      {children}
    </>
  );
}
