import { PublicEnvView } from "@/components/public-env-view";

/**
 * Nothing here is async, so the whole page — the synchronous client read
 * included — lands in the static shell with the build machine's values. The
 * suite asserts both halves of that trade: the capture in the shell, and the
 * heal on hydration once the published script has answered.
 */
export default function ClientPage() {
  return (
    <main>
      <h1>client</h1>
      <PublicEnvView />
    </main>
  );
}
