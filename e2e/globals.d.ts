/** What `<WithClientEnv />` publishes on the client. */
declare interface Window {
  __ENV_SPACES__?: Record<string, Record<string, string | undefined>>;
  __pwned?: boolean;
  /** How often `<UseEnvView />` rendered — one render means it never suspended. */
  useEnvRenders?: number;
  /** How often `<ProvidedEnvView />` rendered. */
  providedEnvRenders?: number;
}
