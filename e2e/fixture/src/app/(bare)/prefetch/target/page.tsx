import { prefetchedAppName, prefetchedAppNameAsync } from "@/prefetched-env";

/**
 * A dynamic page below a loading boundary, with module-scope reads: a
 * prefetch renders the tree only down to the boundary, so the metadata
 * resolution is what imports this module first — during the render.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "prefetched page",
};

export default function PrefetchTargetPage() {
  return (
    <main>
      <h1>prefetched</h1>
      <p data-testid="prefetched-app-name">{prefetchedAppName}</p>
      <p data-testid="prefetched-app-name-async">{prefetchedAppNameAsync}</p>
    </main>
  );
}
