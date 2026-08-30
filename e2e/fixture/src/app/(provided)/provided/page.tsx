import { ProvidedEnvView } from "@/components/provided-env-view";

/** No `<Suspense>`: the promise is handed back already settled, as elsewhere. */
export default function ProvidedPage() {
  return (
    <main>
      <h1>provided</h1>
      <ProvidedEnvView />
    </main>
  );
}
