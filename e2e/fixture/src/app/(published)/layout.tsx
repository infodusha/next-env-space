import { ClientEnvScript } from "next-env-space/server";
import { headers } from "next/headers";

import { featureEnv, publicEnv } from "@/env";

/** Ships the two public spaces to every page below it. */
export default async function PublishedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set by src/proxy.ts on the routes that run under a strict CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <ClientEnvScript space={publicEnv} nonce={nonce} />
      <ClientEnvScript space={featureEnv} nonce={nonce} />
      {children}
    </>
  );
}
