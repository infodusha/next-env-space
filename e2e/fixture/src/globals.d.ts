declare interface Window {
  /** How often `<UseEnvView />` rendered — one render means it never suspended. */
  useEnvRenders?: number;
  /** How often `<ProvidedEnvView />` rendered. */
  providedEnvRenders?: number;
  /** What both reads returned inside `instrumentation-client.ts` on this page. */
  instrumentationClientReads?: {
    readonly sync: string;
    readonly async: string;
  };
}
