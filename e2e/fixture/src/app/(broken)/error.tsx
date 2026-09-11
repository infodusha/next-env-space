"use client";

import { useState } from "react";

import { brokenPublicEnv } from "@/env";

/**
 * Catches the failure of the `broken` segment's layout and shows its message.
 * The button reads the same space in the browser: the raw values arrived ahead
 * of the failure, so the read fails on the same validation error.
 */
export default function BrokenError({ error }: { error: Error }) {
  const [read, setRead] = useState("(not read yet)");

  function readBroken(): void {
    try {
      brokenPublicEnv.get("BROKEN_URL");
      setRead("no error");
    } catch (cause) {
      setRead(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <main>
      <pre data-testid="broken-boundary">{error.message}</pre>
      <button type="button" onClick={readBroken}>
        read the broken space
      </button>
      <pre data-testid="broken-read">{read}</pre>
    </main>
  );
}
