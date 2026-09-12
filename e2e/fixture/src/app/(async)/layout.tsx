import { ClientEnvScript } from "next-env-space/server";

import { asyncEnv } from "@/env";

/**
 * Ships the space whose key validates asynchronously. The publisher awaits
 * that schema before it serialises, the way it parses every other space.
 */
export default function AsyncLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientEnvScript space={asyncEnv} />
      {children}
    </>
  );
}
