"use client";

import { ClientEnvScript } from "next-env-space/server";

/**
 * Never runs: importing "next-env-space/server" from a client module is what
 * the build has to reject, through the `server-only` marker in that entry.
 */
export default function Page() {
  return <p>{typeof ClientEnvScript}</p>;
}
