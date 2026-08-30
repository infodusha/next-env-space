import { ClientEnvScript } from "next-env-space/server";
import { Suspense, type ReactNode } from "react";

import { publicEnv } from "@/env";

/**
 * Ships the public space to every page below it. Under Cache Components the
 * publisher is a dynamic hole, so the boundary sits above it — and above the
 * pages, since the readers have to be inside the same boundary.
 */
export default function PublishedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ClientEnvScript space={publicEnv} />
      {children}
    </Suspense>
  );
}
