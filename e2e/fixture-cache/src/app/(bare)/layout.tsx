import { Suspense, type ReactNode } from "react";

/**
 * No env space is published here — that is what keeps /render-guard and
 * /module-scope prerenderable. The boundary is for the pages that opt out of
 * prerendering and render into a dynamic hole.
 */
export default function BareLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
