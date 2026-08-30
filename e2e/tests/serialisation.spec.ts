import { expect, test } from "@playwright/test";

import { runtimeEnv, unsetKey } from "../env.js";
import { readEnvScripts, readEnvSpaces } from "../html.js";

test.describe("the inline script", () => {
  test("carries the raw values of the published spaces, and nothing else", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();

    expect(readEnvSpaces(html)).toEqual({
      public: {
        APP_NAME: runtimeEnv.APP_NAME,
        // Raw strings — the schema is applied on read, not here.
        REQUEST_TIMEOUT_SECONDS: runtimeEnv.REQUEST_TIMEOUT_SECONDS,
        FEATURE_ENABLED: runtimeEnv.FEATURE_ENABLED,
        UNSAFE_VALUE: runtimeEnv.UNSAFE_VALUE,
      },
      feature: {
        FEATURE_LABEL: runtimeEnv.FEATURE_LABEL,
      },
    });
  });

  test("writes one script per space", async ({ request }) => {
    const html = await (await request.get("/")).text();

    expect(
      readEnvScripts(html).map((script) => Object.keys(script.spaces)),
    ).toEqual([["public"], ["feature"]]);
  });

  test("leaves out a key that is set nowhere", async ({ request }) => {
    const html = await (await request.get("/")).text();

    for (const script of readEnvScripts(html)) {
      expect(script.spaces.public ?? {}).not.toHaveProperty(unsetKey);
    }
  });

  test("never carries a space that stays on the server", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/")).text();

    expect(html).not.toContain(runtimeEnv.SESSION_SECRET);
    expect(html).not.toContain(runtimeEnv.UNPUBLISHED_VALUE);

    await page.goto("/");
    const spaces = await page.evaluate(() => window.__ENV_SPACES__);
    expect(spaces).not.toHaveProperty("server");
    expect(spaces).not.toHaveProperty("unpublished");
  });

  test("escapes a value that would close the script tag", async ({
    page,
    request,
  }) => {
    const html = await (await request.get("/")).text();

    // A raw `</script>` in the value would end the tag and leave the rest of
    // it as markup of its own.
    expect(html).not.toContain("<script>globalThis.__pwned = true;</script>");
    expect(readEnvSpaces(html).public?.UNSAFE_VALUE).toBe(
      runtimeEnv.UNSAFE_VALUE,
    );

    await page.goto("/");
    await expect(page.getByTestId("client-unsafe-value")).toHaveText(
      runtimeEnv.UNSAFE_VALUE,
    );
    expect(await page.evaluate(() => window.__pwned ?? false)).toBe(false);
  });
});
