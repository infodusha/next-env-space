import { PublicEnvView } from "@/components/public-env-view";

/** Served under the strict CSP from src/proxy.ts. */
export default function CspPage() {
  return (
    <main>
      <h1>csp</h1>
      <PublicEnvView />
    </main>
  );
}
