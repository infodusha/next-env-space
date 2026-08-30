"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useContext, useMemo, useRef, type ReactNode } from "react";

import { envContext } from "./context.js";
import { envSpacesKey, type RawEnv } from "./global.js";

const EnvContext = envContext();

interface ClientEnvProps {
  readonly name: string;
  readonly rawEnv: RawEnv;
  readonly nonce?: string | undefined;
}

export function ClientEnv({ name, rawEnv, nonce }: ClientEnvProps) {
  const hasFlushed = useRef(false);

  publishToWindow(name, rawEnv);

  useServerInsertedHTML(() => {
    if (hasFlushed.current) {
      return null;
    }

    hasFlushed.current = true;

    return (
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: createEnvScript(name, rawEnv) }}
        type="text/javascript"
      />
    );
  });

  return null;
}

interface ClientEnvProviderProps {
  readonly name: string;
  readonly rawEnv: RawEnv;
  readonly children?: ReactNode;
}

export function ClientEnvProvider({
  name,
  rawEnv,
  children,
}: ClientEnvProviderProps) {
  const outer = useContext(EnvContext);
  const spaces = useMemo(
    () => ({ ...outer, [name]: rawEnv }),
    [outer, name, rawEnv],
  );

  return <EnvContext value={spaces}>{children}</EnvContext>;
}

function publishToWindow(name: string, rawEnv: RawEnv): void {
  if (typeof window === "undefined") {
    return;
  }

  const spaces = window[envSpacesKey];
  if (spaces?.[name] !== undefined) {
    return;
  }

  window[envSpacesKey] = { ...spaces, [name]: rawEnv };
}

function createEnvScript(name: string, rawEnv: RawEnv): string {
  const key = serialize(envSpacesKey);
  const space = serialize({ [name]: rawEnv });
  return `window[${key}]=Object.assign(window[${key}]||{},${space});`;
}

function serialize(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
