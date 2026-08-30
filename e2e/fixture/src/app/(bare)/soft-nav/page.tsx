import Link from "next/link";

/**
 * Outside the `(published)` layout, so the link below mounts that layout —
 * and the `<WithClientEnv />` in it — in the browser, where nothing can be
 * inserted into the document any more.
 */
export default function SoftNavPage() {
  return (
    <main>
      <h1>soft nav</h1>
      <Link href="/client">to client page</Link>
      <Link href="/provided">to provided page</Link>
    </main>
  );
}
