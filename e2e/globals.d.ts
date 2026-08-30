/** What `<WithClientEnv />` publishes on the client. */
declare interface Window {
  __ENV_SPACES__?: Record<string, Record<string, string | undefined>>;
  __pwned?: boolean;
}
