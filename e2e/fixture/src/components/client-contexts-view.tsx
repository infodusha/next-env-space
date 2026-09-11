"use client";

import { useEffect, useState } from "react";

import {
  clientModuleAppName,
  clientModuleAppNameAsync,
} from "@/client-module-scope-env";
import { readBoth, type Reads } from "@/contexts";

const unread: Reads = { sync: "(not read yet)", async: "(not read yet)" };

/**
 * The client rows of the README table that happen outside a render, on a page
 * that renders `<ClientEnvScript />`: both reads at module scope of a client
 * module, in an effect, and in a click handler. The module-scope values agree
 * between the server and the browser, and the other two are unread until the
 * browser runs, so hydration has nothing to trip on.
 */
export function ClientContextsView() {
  const [effectReads, setEffectReads] = useState(unread);
  const [handlerReads, setHandlerReads] = useState(unread);

  useEffect(() => {
    void readBoth().then(setEffectReads);
  }, []);

  return (
    <section>
      <p data-testid="client-module-scope-sync">{clientModuleAppName}</p>
      <p data-testid="client-module-scope-async">{clientModuleAppNameAsync}</p>
      <p data-testid="client-effect-sync">{effectReads.sync}</p>
      <p data-testid="client-effect-async">{effectReads.async}</p>
      <button
        type="button"
        onClick={() => void readBoth().then(setHandlerReads)}
      >
        read in a handler
      </button>
      <p data-testid="client-handler-sync">{handlerReads.sync}</p>
      <p data-testid="client-handler-async">{handlerReads.async}</p>
    </section>
  );
}
