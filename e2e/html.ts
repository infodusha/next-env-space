/** The script `<ClientEnvScript />` writes into the document. */
const envScript =
  /<script(?<attributes>[^>]*)>window\["__ENV_SPACES__"\]=Object\.assign\(window\["__ENV_SPACES__"\]\|\|[{][}],(?<payload>.*?)\);<\/script>/gsu;

const nonceAttribute = /nonce="([^"]*)"/u;

export type RawEnv = Record<string, string>;

export interface EnvScript {
  readonly nonce: string | undefined;
  readonly spaces: Record<string, RawEnv>;
}

export function readEnvScripts(html: string): EnvScript[] {
  return [...html.matchAll(envScript)].map((match) => {
    const { attributes = "", payload = "{}" } = match.groups ?? {};
    return {
      nonce: nonceAttribute.exec(attributes)?.[1],
      // The serialiser escapes every `<` as a \u003c escape, which is
      // valid JSON, so JSON.parse reads it back on its own.
      spaces: JSON.parse(payload) as Record<string, RawEnv>,
    };
  });
}

/** Every space of the document, merged the way the browser merges them. */
export function readEnvSpaces(html: string): Record<string, RawEnv> {
  return Object.assign(
    {},
    ...readEnvScripts(html).map((script) => script.spaces),
  ) as Record<string, RawEnv>;
}
