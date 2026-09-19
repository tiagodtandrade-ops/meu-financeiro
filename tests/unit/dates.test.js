import test from "node:test";
import assert from "node:assert/strict";
import { formatISODateBR, todayLocalISO } from "../../js/utils/dates.js";
test("formata data civil sem conversão UTC", () =>
  assert.equal(formatISODateBR("2026-09-17"), "17/09/2026"));
test("gera data local ISO a partir de componentes locais", () =>
  assert.equal(todayLocalISO(new Date(2026, 8, 17, 23, 30)), "2026-09-17"));

import { isISODate } from "../../js/utils/dates.js";
for (const value of [
  "0001-01-01",
  "9999-12-31",
  "2024-02-29",
  "2000-02-29",
  "1900-02-28",
  "2026-04-30",
  "2026-01-31",
]) {
  test(`data válida ${value}`, () => assert.equal(isISODate(value), true));
}
for (const value of [
  "2026-02-31",
  "2026-13-99",
  "0000-00-00",
  "0000-01-01",
  "10000-01-01",
  "2026-02-29",
  "1900-02-29",
  "2026-04-31",
  "2026-00-01",
  "2026-01-00",
  "2026-1-01",
  "",
  null,
  undefined,
  20260101,
  {},
  [],
  new Date(),
]) {
  test(`data inválida ${String(value)}`, () => {
    assert.equal(isISODate(value), false);
    assert.throws(() => formatISODateBR(value), TypeError);
  });
}
