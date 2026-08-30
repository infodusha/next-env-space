"use client";

import { Component, use, type ReactNode } from "react";

import { unpublishedEnv } from "@/env";

/**
 * Reads a space that was never shipped, with `use()` during the render. On
 * the server the read still answers from `process.env`, so it is the browser
 * render that throws — the boundary below has to catch it and show the words.
 */
export function UseUnpublishedEnvView() {
  return (
    <ReadErrorBoundary>
      <ReadUnpublished />
    </ReadErrorBoundary>
  );
}

function ReadUnpublished() {
  const value = use(unpublishedEnv.getAsync("UNPUBLISHED_VALUE"));
  return <p data-testid="unpublished-use-value">{value}</p>;
}

interface ReadErrorBoundaryState {
  readonly message: string | null;
}

class ReadErrorBoundary extends Component<
  { readonly children: ReactNode },
  ReadErrorBoundaryState
> {
  override state: ReadErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): ReadErrorBoundaryState {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <pre data-testid="unpublished-use-message">{this.state.message}</pre>
      );
    }
    return this.props.children;
  }
}
