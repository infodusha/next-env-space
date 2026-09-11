import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";
import { readEnvSpaces } from "../html.js";

test("a value the schema rejects names itself and its space", async ({
  request,
}) => {
  const response = await request.get("/api/broken");

  expect(response.status()).toBe(500);
  expect(await response.json()).toEqual({
    message:
      'Environment variable BROKEN_URL of the "broken" env space is not valid: Invalid URL',
  });
});

test("two bad values are reported together, not one per restart", async ({
  request,
}) => {
  const response = await request.get("/api/broken-pair");

  expect(response.status()).toBe(500);
  const { message } = (await response.json()) as { message: string };

  expect(message).toContain(
    '2 environment variables of the "broken-pair" env space are not valid',
  );
  expect(message).toContain("BROKEN_URL: Invalid URL");
  expect(message).toContain("BROKEN_COUNT:");
});

// The layout publishes the space with <ClientEnvScript />, and the render has
// to fail on the server as before. What must not happen is the failure taking
// the script down with it: then every browser read, the one at module scope of
// instrumentation-client.ts first, reports a missing space instead of this.
test.describe("a published space the schema rejects", () => {
  const message =
    'Environment variable BROKEN_URL of the "broken-public" env space is not valid: Invalid URL';

  test("fails the render on the server, with the raw values shipped regardless", async ({
    request,
  }) => {
    const response = await request.get("/broken");

    expect(response.status()).toBe(500);
    expect(readEnvSpaces(await response.text())["broken-public"]).toEqual({
      BROKEN_URL: runtimeEnv.BROKEN_URL,
    });
  });

  test("reaches the error boundary with the validation message", async ({
    page,
  }) => {
    await page.goto("/broken");

    await expect(page.getByTestId("broken-boundary")).toHaveText(message);
  });

  test("fails a browser read on the same message, not on a missing space", async ({
    page,
  }) => {
    await page.goto("/broken");
    await page.getByRole("button", { name: "read the broken space" }).click();

    await expect(page.getByTestId("broken-read")).toHaveText(message);
  });
});
