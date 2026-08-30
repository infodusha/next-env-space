import { ClientEnvProvider } from "next-env-space/server";

import { providedEnv, providedNestedEnv } from "@/env";

/**
 * Ships the two spaces through context instead of an inline script. Nested on
 * purpose: a second provider has to merge with the first, not replace it.
 */
export default function ProvidedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientEnvProvider space={providedEnv}>
      <ClientEnvProvider space={providedNestedEnv}>
        {children}
      </ClientEnvProvider>
    </ClientEnvProvider>
  );
}
