import { envSpacesKey, type RawEnv } from "./global.js";

export interface EnvRuntime {
  readonly optOutOfPrerender: () => Promise<void>;
  readonly optsOutInReactServer: boolean;
  readonly readContextRawEnv: ((name: string) => RawEnv | undefined) | null;
}

export function readRawEnv(
  runtime: EnvRuntime,
  name: string,
  fromContext: boolean,
): RawEnv {
  if (typeof window === "undefined") {
    return process.env;
  }

  const published = window[envSpacesKey]?.[name];
  if (published !== undefined) {
    return published;
  }

  const provided = fromContext ? readProvidedEnv(runtime, name) : undefined;
  if (provided !== undefined) {
    return provided;
  }

  throw new Error(
    `Env space "${name}" is missing on the client. ` +
      `Render <ClientEnvScript space={...} /> or <ClientEnvProvider space={...}> from ` +
      `"next-env-space/server" above the components that read it.`,
  );
}

function readProvidedEnv(
  runtime: EnvRuntime,
  name: string,
): RawEnv | undefined {
  const read = runtime.readContextRawEnv;
  if (read === null) {
    return undefined;
  }

  try {
    return read(name);
  } catch {
    throw new Error(
      `getAsync() of the "${name}" env space was called outside of a render, ` +
        `where the <ClientEnvProvider> context cannot be read. Publish the space with ` +
        `<ClientEnvScript space={...} /> instead — it lands before any component runs.`,
    );
  }
}
