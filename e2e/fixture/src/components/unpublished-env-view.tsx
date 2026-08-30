"use client";

import { useState } from "react";

import { unpublishedEnv } from "@/env";

/**
 * Reads a space that was never shipped to the browser. The read is behind a
 * click so it happens in the browser only, never during SSR — where the value
 * would still come from `process.env`.
 */
export function UnpublishedEnvView() {
  const [message, setMessage] = useState("(not read yet)");

  function read(): void {
    try {
      unpublishedEnv.getEnv("UNPUBLISHED_VALUE");
      setMessage("no error");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <button type="button" onClick={read}>
        read the unpublished space
      </button>
      <pre data-testid="message">{message}</pre>
    </>
  );
}
