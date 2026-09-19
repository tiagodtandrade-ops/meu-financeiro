import test from "node:test";
import assert from "node:assert/strict";
import { assertCents, formatBRL } from "../../js/utils/money.js";
test("aceita somente inteiros seguros em centavos", () => {
  assert.equal(assertCents(1234), 1234);
  assert.throws(() => assertCents(12.34));
});
test("formata BRL sem alterar a representação persistente", () => {
  assert.match(formatBRL(123456), /1\.234,56/);
});
