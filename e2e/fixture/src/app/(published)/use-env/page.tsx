import Link from "next/link";

import { UseEnvView } from "@/components/use-env-view";

/**
 * `getAsync()` unwrapped with `use()` in a client component. No `<Suspense>`
 * around it on purpose: this app runs without Cache Components, so there is no
 * prerender to opt out of and the promise is handed back already settled.
 */
export default function UseEnvPage() {
  return (
    <main>
      <h1>use</h1>
      <UseEnvView />
      <Link href="/">to home page</Link>
    </main>
  );
}
