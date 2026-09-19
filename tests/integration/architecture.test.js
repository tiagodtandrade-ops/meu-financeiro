import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("cinco views existentes não possuem imports estáticos com Dexie, database ou repository", async () => {
  const files = [
    "dashboard-view",
    "transactions-view",
    "accounts-view",
    "budgets-view",
    "settings-view",
  ];
  for (const name of files) {
    const src = await readFile(
      new URL(`../../js/views/${name}.js`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(src, /import\s+.*(?:Dexie|database|repository)/i);
  }
});
