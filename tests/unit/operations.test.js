import test from "node:test";
import assert from "node:assert/strict";
import { listOperations } from "../../js/services/operations-service.js";

test("adapter agrupa par e preserva ordem do motor", async () => {
  const out = {
    id: "out",
    type: "transfer",
    transferId: "pair",
    accountId: "source",
    direction: "out",
  };
  const incoming = {
    ...out,
    id: "in",
    accountId: "destination",
    direction: "in",
  };
  const income = { id: "income", type: "income" };
  let calls = 0;
  const api = {
    transactions: {
      list: async () => [out, incoming, income],
      getTransfer: async () => {
        calls++;
        return { entries: [out, incoming] };
      },
    },
  };
  const result = await listOperations(api);
  assert.equal(result.length, 2);
  assert.equal(calls, 1);
  assert.equal(result[0].fromAccountId, "source");
  assert.equal(result[0].toAccountId, "destination");
  assert.equal(result[1], income);
});

test("adapter resolve origem mesmo com filtro apenas na perna de destino", async () => {
  const out = {
    id: "out",
    type: "transfer",
    transferId: "pair",
    accountId: "source",
    direction: "out",
  };
  const incoming = {
    ...out,
    id: "in",
    accountId: "destination",
    direction: "in",
  };
  const filters = { accountId: "destination", text: "café" };
  const api = {
    transactions: {
      list: async (received) => {
        assert.equal(received, filters);
        return [incoming];
      },
      getTransfer: async () => ({ entries: [out, incoming] }),
    },
  };
  const result = await listOperations(api, filters);
  assert.equal(result.length, 1);
  assert.equal(result[0].fromAccountId, "source");
});

test("adapter propaga falha de integridade sem mostrar transferência parcial", async () => {
  const error = new Error("inconsistent");
  const api = {
    transactions: {
      list: async () => [{ type: "transfer", transferId: "pair" }],
      getTransfer: async () => {
        throw error;
      },
    },
  };
  await assert.rejects(listOperations(api), (received) => received === error);
});
