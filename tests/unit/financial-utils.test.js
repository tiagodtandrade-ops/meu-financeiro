import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBRLToCents,
  addCents,
  subtractCents,
  sumCents,
  formatBRL,
} from "../../js/utils/money.js";
import { monthInterval, compareDatedRecords } from "../../js/utils/dates.js";

test("entrada pt-BR exata, sinal, agrupamento e limite seguro", () => {
  for (const [text, cents] of [
    ["0", 0],
    ["0,01", 1],
    ["1.234,56", 123456],
    ["-0,01", -1],
    [" 12,34 ", 1234],
    ["90.071.992.547.409,91", Number.MAX_SAFE_INTEGER],
  ])
    assert.equal(parseBRLToCents(text), cents);
});
test("entrada monetária inválida não vira zero nem é arredondada", () => {
  for (const value of [
    "",
    " ",
    "1,2",
    "1,234",
    "1.23",
    "1.2345",
    "1,000.00",
    "01",
    "R$ 1,00",
    "+1",
    "1e3",
    1.2,
    null,
    "90.071.992.547.409,92",
  ])
    assert.throws(() => parseBRLToCents(value));
});
test("aritmética inteira e overflow explícito", () => {
  assert.equal(addCents(10, 20), 30);
  assert.equal(subtractCents(10, 30), -20);
  assert.equal(
    sumCents([Number.MAX_SAFE_INTEGER, 1, -1]),
    Number.MAX_SAFE_INTEGER,
  );
  assert.throws(() => addCents(Number.MAX_SAFE_INTEGER, 1), RangeError);
  assert.throws(() => sumCents([0.1]), TypeError);
});
test("formatação exata inclusive extremo seguro e centavo negativo", () => {
  assert.equal(
    formatBRL(Number.MAX_SAFE_INTEGER).replace(/\s/g, ""),
    "R$90.071.992.547.409,91",
  );
  assert.equal(formatBRL(-1).replace(/\s/g, ""), "-R$0,01");
});
test("intervalos mensais, bissextos e virada de ano sem UTC", () => {
  for (const [month, end] of [
    ["2026-12", "2026-12-31"],
    ["2027-01", "2027-01-31"],
    ["2000-02", "2000-02-29"],
    ["1900-02", "1900-02-28"],
    ["0001-01", "0001-01-31"],
    ["9999-12", "9999-12-31"],
  ])
    assert.deepEqual(monthInterval(month), { from: `${month}-01`, to: end });
  for (const month of ["0000-01", "2026-13", "2026-00", "2026-1", null])
    assert.throws(() => monthInterval(month));
});
test("ordenação por data, timestamp técnico e ID estável", () => {
  const rows = [
    { id: "z", date: "2026-02-01", createdAt: "b" },
    { id: "b", date: "2026-02-01", createdAt: "a" },
    { id: "a", date: "2026-02-01", createdAt: "a" },
    { id: "c", date: "2026-01-01", createdAt: "z" },
  ];
  assert.deepEqual(
    rows.sort(compareDatedRecords).map((row) => row.id),
    ["c", "a", "b", "z"],
  );
});
