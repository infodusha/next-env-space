"use client";

import { useState } from "react";

import { providedNestedEnv } from "@/env";

/**
 * The space is in context, but both reads happen after the render they would
 * need: `get()` never looks at the context, and `getAsync()` cannot reach it
 * from a click handler. Each has to say so in its own words.
 */
export function ProvidedLateEnvView() {
  const [message, setMessage] = useState("(not read yet)");

  function readSync(): void {
    setMessage(toMessage(() => providedNestedEnv.get("PROVIDED_NESTED")));
  }

  async function readAsync(): Promise<void> {
    setMessage(
      await toMessageAsync(providedNestedEnv.getAsync("PROVIDED_NESTED")),
    );
  }

  return (
    <>
      <button type="button" onClick={readSync}>
        read it synchronously
      </button>
      <button type="button" onClick={() => void readAsync()}>
        read it asynchronously
      </button>
      <pre data-testid="message">{message}</pre>
    </>
  );
}

function toMessage(read: () => string): string {
  try {
    read();
    return "no error";
  } catch (error) {
    return describe(error);
  }
}

async function toMessageAsync(read: Promise<string>): Promise<string> {
  try {
    await read;
    return "no error";
  } catch (error) {
    return describe(error);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
