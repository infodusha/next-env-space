import { errorDocumentReadError, isErrorDocument } from "./error-document.js";
import { envSpacesKey, type RawEnv } from "./global.js";

export type ReadContext = (name: string) => RawEnv | undefined;

export interface EnvRuntime {
  readonly optOutOfPrerender: () => Promise<void>;
  readonly optsOutInReactServer: boolean;
  readonly readContextRawEnv: ReadContext | null;
}

export function readRawEnv(
  name: string,
  readContext: ReadContext | null,
): RawEnv {
  if (typeof window === "undefined") {
    return process.env;
  }

  const published = window[envSpacesKey]?.[name];
  if (published !== undefined) {
    return published;
  }

  const provided =
    readContext === null ? undefined : readProvidedEnv(readContext, name);
  if (provided !== undefined) {
    return provided;
  }

  if (isErrorDocument()) {
    throw errorDocumentReadError(name);
  }

  throw new Error(
    `Env space "${name}" is missing on the client. ` +
      `Render <ClientEnvScript space={...} /> or <ClientEnvProvider space={...}> from ` +
      `"next-env-space/server" above the components that read it.`,
  );
}

function readProvidedEnv(
  readContext: ReadContext,
  name: string,
): RawEnv | undefined {
  try {
    return readContext(name);
  } catch {
    if (isErrorDocument()) {
      throw errorDocumentReadError(name);
    }

    throw new Error(
      `getAsync() of the "${name}" env space was called outside of a render, ` +
        `where the <ClientEnvProvider> context cannot be read. Publish the space with ` +
        `<ClientEnvScript space={...} /> instead — it lands before any component runs.`,
    );
  }
}
