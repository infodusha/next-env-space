"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useContext, useMemo, useRef, type ReactNode } from "react";

import { envContext } from "./context.js";
import type { RawEnv } from "./global.js";
import { createEnvScript, publishToWindow } from "./publish.js";

const EnvContext = envContext();

interface EnvScriptProps {
  readonly name: string;
  readonly rawEnv: RawEnv;
  readonly nonce?: string | undefined;
  readonly failure?: string | undefined;
}

export function EnvScript({ name, rawEnv, nonce, failure }: EnvScriptProps) {
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
      />
    );
  });

  if (failure !== undefined) {
    throw new Error(failure);
  }

  return null;
}

interface EnvProviderProps {
  readonly name: string;
  readonly rawEnv: RawEnv;
  readonly children?: ReactNode;
}

export function EnvProvider({ name, rawEnv, children }: EnvProviderProps) {
  const outer = useContext(EnvContext);
  const spaces = useMemo(
    () => ({ ...outer, [name]: rawEnv }),
    [outer, name, rawEnv],
  );

  return <EnvContext value={spaces}>{children}</EnvContext>;
}
