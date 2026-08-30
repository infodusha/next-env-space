declare interface Window {
  /** How often `<UseEnvView />` rendered — one render means it never suspended. */
  useEnvRenders?: number;
  /** How often `<ProvidedEnvView />` rendered. */
  providedEnvRenders?: number;
}
