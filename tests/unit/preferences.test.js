import test from "node:test";
import assert from "node:assert/strict";
import { readTheme, saveTheme } from "../../js/utils/preferences.js";

test("tema conhecido persiste e valores desconhecidos usam claro", () => {
  let value = null;
  const storage = () => ({
    getItem: () => value,
    setItem: (_, next) => {
      value = next;
    },
  });
  assert.equal(readTheme(storage), "light");
  assert.equal(saveTheme("dark", storage), true);
  assert.equal(readTheme(storage), "dark");
  value = "unknown";
  assert.equal(readTheme(storage), "light");
});
test("falha de leitura ou acesso ao storage usa claro", () => {
  const fail = () => {
    throw new Error("blocked");
  };
  assert.equal(readTheme(fail), "light");
  assert.equal(
    readTheme(() => ({ getItem: fail })),
    "light",
  );
});
test("falha de escrita é sinalizada sem interromper a sessão", () => {
  const fail = () => {
    throw new Error("blocked");
  };
  assert.equal(saveTheme("dark", fail), false);
  assert.equal(
    saveTheme("dark", () => ({ setItem: fail })),
    false,
  );
});
