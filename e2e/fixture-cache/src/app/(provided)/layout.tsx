import { ClientEnvProvider } from "next-env-space/server";
import { Suspense, type ReactNode } from "react";

import { providedEnv, providedNestedEnv } from "@/env";

/**
 * Ships the two spaces through context instead of an inline script. Nested on
 * purpose: a second provider has to merge with the first, not replace it. The
 * providers are dynamic holes under Cache Components, hence the boundary.
 */
export default function ProvidedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ClientEnvProvider space={providedEnv}>
        <ClientEnvProvider space={providedNestedEnv}>
          {children}
        </ClientEnvProvider>
      </ClientEnvProvider>
    </Suspense>
  );
}
