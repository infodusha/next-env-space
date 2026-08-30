"use client";

import { useState } from "react";

import { readEnvAction } from "@/actions";

/** Reads the spaces through a Server Action, from a click in the browser. */
export function ActionEnvView() {
  const [result, setResult] = useState("(not read yet)");

  async function read(): Promise<void> {
    const env = await readEnvAction();
    setResult(
      `${env.appName} ${env.appNameAsync} secret:${env.sessionSecretLength}`,
    );
  }

  return (
    <>
      <button type="button" onClick={() => void read()}>
        read in a server action
      </button>
      <pre data-testid="action-env">{result}</pre>
    </>
  );
}
