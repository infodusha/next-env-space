"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

import { envSpacesKey, type RawEnv } from "./global.js";

interface ClientEnvProps {
  readonly name: string;
  readonly rawEnv: RawEnv;
  readonly nonce?: string | undefined;
}

export function ClientEnv({ name, rawEnv, nonce }: ClientEnvProps) {
  const hasFlushed = useRef(false);

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

function createEnvScript(name: string, rawEnv: RawEnv): string {
  const key = serialize(envSpacesKey);
  const space = serialize({ [name]: rawEnv });
  return `window[${key}]=Object.assign(window[${key}]||{},${space});`;
}

function serialize(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
