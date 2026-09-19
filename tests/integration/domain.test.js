import "fake-indexeddb/auto";
import test from "node:test";
import { scenarioNames, runScenario } from "./scenarios.js";

scenarioNames.forEach((name, index) => {
  test(`IndexedDB emulado: ${name}`, () => runScenario(index));
});
