import { expect, test } from "@playwright/test";

import { runtimeEnv } from "../env.js";
import { readEnvScripts } from "../html.js";

test.describe("under a strict Content-Security-Policy", () => {
  test("every script carries the nonce of that response", async ({
    request,
  }) => {
    const response = await request.get("/csp");
    const nonce = /'nonce-([^']+)'/u.exec(
      response.headers()["content-security-policy"] ?? "",
    )?.[1];

    expect(nonce, "the proxy did not set a nonce").toBeTruthy();

    const scripts = readEnvScripts(await response.text());
    expect(scripts).toHaveLength(2);
    for (const script of scripts) {
      expect(script.nonce).toBe(nonce);
    }
  });

  test("the browser lets those scripts run", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy")) {
        violations.push(message.text());
      }
    });

    await page.goto("/csp");

    await expect(page.getByTestId("client-app-name")).toHaveText(
      runtimeEnv.APP_NAME,
    );
    expect(violations).toEqual([]);
  });

  test("no nonce is set on a route the policy does not cover", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();

    for (const script of readEnvScripts(html)) {
      expect(script.nonce).toBeUndefined();
    }
  });
});
