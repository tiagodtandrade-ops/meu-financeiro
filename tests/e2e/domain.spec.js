import { test, expect } from "@playwright/test";
import { traceIndexedDB } from "./lifecycle-evidence.js";
import { scenarioNames } from "../integration/scenarios.js";

scenarioNames.forEach((name, index) => {
  test(`IndexedDB real: ${name}`, async ({ page }, testInfo) => {
    const errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type()))
        errors.push(message.text());
    });
    page.on("request", (request) => requests.push(request.url()));
    page.on("requestfailed", (request) =>
      errors.push(`requestfailed: ${request.url()}`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`HTTP ${response.status()}`);
    });
    await page.addInitScript(traceIndexedDB);
    await page.goto("/");
    const result = await page.evaluate(async (index) => {
      const { runScenario } = await import("/tests/integration/scenarios.js");
      return runScenario(index);
    }, index);
    await testInfo.attach("indexeddb-evidence.json", {
      body: JSON.stringify(
        {
          browser: page.context().browser().version(),
          result,
          errors,
          requests,
          lifecycle: await page.evaluate(() => window.databaseEvents),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    expect(result.status).toBe("passed");
    expect(errors).toEqual([]);
    expect(
      requests.every((url) => url.startsWith("http://127.0.0.1:4173/")),
    ).toBe(true);
  });
});
