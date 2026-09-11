import Link from "next/link";

/**
 * In production the link below is prefetched as soon as it is in view, which
 * makes that prefetch the first request to reach `/prefetch/target`.
 */
export default function PrefetchPage() {
  return (
    <main>
      <h1>prefetch</h1>
      <Link href="/prefetch/target">to prefetched page</Link>
    </main>
  );
}
