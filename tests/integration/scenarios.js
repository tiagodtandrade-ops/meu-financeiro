// The same assertions run against real IndexedDB in browser and its Node emulator.
import Dexie from "../../vendor/dexie.mjs";
import { closeTestDatabase } from "./cleanup.js";
import { createDatabase, openDatabase } from "../../js/db/database.js";
import { SCHEMA_V1 } from "../../js/db/schema.js";
import { createFinance } from "../../js/services/index.js";

function equal(actual, expected, message = "Valores divergentes") {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      `${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`,
    );
}
function ok(value, message) {
  if (!value) throw new Error(message);
}
async function rejects(work, code) {
  try {
    await work();
  } catch (error) {
    if (code) equal(error.code, code, error.message);
    return error;
  }
  throw new Error(`Operação deveria falhar: ${code ?? "erro esperado"}`);
}
const accountInput = (name = "Conta") => ({
  name,
  type: "checking",
  initialBalanceCents: 10000,
  initialBalanceDate: "2026-01-01",
});
async function fixture(f) {
  const source = await f.accounts.create(accountInput("Origem"));
  const target = await f.accounts.create({
    ...accountInput("Destino"),
    initialBalanceCents: 0,
  });
  const income = await f.categories.create({ name: "Salário", kind: "income" });
  const expense = await f.categories.create({
    name: "Alimentação",
    kind: "expense",
  });
  const posting = {
    description: "Compra de pão",
    date: "2026-02-10",
    amountCents: 500,
    type: "expense",
    accountId: source.id,
    categoryId: expense.id,
  };
  const transfer = {
    description: "Reserva",
    date: "2026-02-10",
    amountCents: 2000,
    fromAccountId: source.id,
    toAccountId: target.id,
  };
  return { source, target, income, expense, posting, transfer };
}

export const scenarios = [
  [
    "abertura V2, banco vazio e cada entidade",
    async ({ db, f }) => {
      equal(db.verno, 2);
      equal(db.tables.map((t) => t.name).sort(), [
        "accounts",
        "budgets",
        "categories",
        "settings",
        "transactions",
      ]);
      equal(await f.analytics.balances("2026-12-31"), {
        asOf: "2026-12-31",
        byAccount: [],
        totalCents: 0,
      });
      equal(await f.analytics.totals(), { incomeCents: 0, expenseCents: 0 });
      equal(await f.transactions.list(), []);
      const x = await fixture(f);
      equal((await f.accounts.get(x.source.id)).initialBalanceCents, 10000);
      equal((await f.categories.get(x.expense.id)).name, "Alimentação");
      const tx = await f.transactions.create(x.posting);
      equal((await f.transactions.get(tx.id)).amountCents, 500);
      const budget = await f.budgets.save({
        month: "2026-02",
        categoryId: x.expense.id,
        limitCents: 20000,
      });
      equal(
        (await f.budgets.get(budget.id)).budgetKey,
        `2026-02|${x.expense.id}`,
      );
      equal(await f.settings.initialize(), { seeded: true });
      equal((await f.settings.get()).currency, "BRL");
      equal(await db.settings.count(), 2);
      ok(
        !("balanceCents" in (await f.accounts.get(x.source.id))),
        "Saldo derivado não deve ser persistido",
      );
    },
  ],
  [
    "saldo inicial, saldo derivado, futuros e contas arquivadas",
    async ({ f }) => {
      const x = await fixture(f);
      await f.transactions.create(x.posting);
      await f.transactions.create({
        ...x.posting,
        type: "income",
        categoryId: x.income.id,
        amountCents: 3000,
      });
      await f.transactions.create({
        ...x.posting,
        date: "2027-01-01",
        amountCents: 999,
      });
      equal(await f.analytics.balance(x.source.id, "2026-12-31"), 12500);
      equal(await f.analytics.balance(x.source.id, "2025-12-31"), 0);
      await f.accounts.archive(x.source.id);
      equal((await f.analytics.balances("2026-12-31")).totalCents, 12500);
      equal((await f.accounts.list({ includeArchived: false })).length, 1);
      equal(
        await f.analytics.totals({ from: "2026-01-01", to: "2026-12-31" }),
        { incomeCents: 3000, expenseCents: 500 },
      );
    },
  ],
  [
    "CRUD de contas e proteção da data inicial",
    async ({ f }) => {
      const x = await fixture(f);
      const createdAt = x.source.createdAt;
      await f.accounts.update(x.source.id, {
        name: "Conta editada",
        initialBalanceCents: -100,
      });
      equal((await f.accounts.get(x.source.id)).createdAt, createdAt);
      await f.transactions.create(x.posting);
      await rejects(
        () =>
          f.accounts.update(x.source.id, { initialBalanceDate: "2026-03-01" }),
        "DATE_BEFORE_OPENING",
      );
      equal(
        (await f.accounts.get(x.source.id)).initialBalanceDate,
        "2026-01-01",
      );
      await rejects(() => f.accounts.remove(x.source.id), "REFERENCED");
      await f.accounts.archive(x.source.id);
      await rejects(() => f.transactions.create(x.posting), "ARCHIVED");
      await f.accounts.archive(x.source.id, false);
      await f.transactions.create(x.posting);
      await f.accounts.remove(x.target.id);
      await rejects(() => f.accounts.get(x.target.id), "NOT_FOUND");
    },
  ],
  [
    "categorias: edição, arquivo, exclusão e referências de orçamento",
    async ({ f }) => {
      const x = await fixture(f);
      await f.categories.update(x.expense.id, { name: "Mercado" });
      await f.transactions.create(x.posting);
      await rejects(
        () => f.categories.update(x.expense.id, { kind: "income" }),
        "REFERENCED",
      );
      await rejects(() => f.categories.remove(x.expense.id), "REFERENCED");
      await f.categories.archive(x.expense.id);
      await rejects(() => f.transactions.create(x.posting), "ARCHIVED");
      equal((await f.categories.list({ includeArchived: false })).length, 1);
      await f.categories.archive(x.expense.id, false);
      const spare = await f.categories.create({
        name: "Lazer",
        kind: "expense",
      });
      const b = await f.budgets.save({
        month: "2026-01",
        categoryId: spare.id,
        limitCents: 500,
      });
      await rejects(() => f.categories.remove(spare.id), "REFERENCED");
      await f.budgets.remove(b.id);
      await f.categories.remove(spare.id);
      await rejects(() => f.categories.get(spare.id), "NOT_FOUND");
    },
  ],
  [
    "receitas/despesas: edição mantém ID, tipo compatível e exclusão",
    async ({ f }) => {
      const x = await fixture(f);
      const old = await f.transactions.create(x.posting);
      const edited = await f.transactions.update(old.id, {
        type: "income",
        categoryId: x.income.id,
        amountCents: 700,
        description: "Devolução",
      });
      equal(edited.id, old.id);
      equal(edited.createdAt, old.createdAt);
      equal(await f.analytics.balance(x.source.id, "2026-12-31"), 10700);
      await rejects(
        () => f.transactions.update(old.id, { type: "expense" }),
        "CATEGORY_KIND",
      );
      equal((await f.transactions.get(old.id)).type, "income");
      await f.transactions.remove(old.id);
      equal(await f.analytics.balance(x.source.id, "2026-12-31"), 10000);
      await rejects(() => f.transactions.get(old.id), "NOT_FOUND");
    },
  ],
  [
    "filtros combinados e ordenação determinística na mesma data",
    async ({ f, db }) => {
      const x = await fixture(f);
      const a = await f.transactions.create({
        ...x.posting,
        notes: "Café familiar",
      });
      await f.transactions.create({
        ...x.posting,
        accountId: x.target.id,
        description: "Cinema",
        date: "2026-02-11",
      });
      await f.transactions.create({
        ...x.posting,
        type: "income",
        categoryId: x.income.id,
        description: "Salário",
      });
      const list = await f.transactions.list({
        from: "2026-02-10",
        to: "2026-02-10",
        accountId: x.source.id,
        categoryId: x.expense.id,
        type: "expense",
        text: "CAFE",
      });
      equal(
        list.map((t) => t.id),
        [a.id],
      );
      equal((await f.transactions.list({ text: "salario" })).length, 1);
      await rejects(
        () => f.transactions.list({ from: "2026-02-12", to: "2026-02-01" }),
        "VALIDATION",
      );
      await db.transactions
        .toCollection()
        .modify({ createdAt: "2026-01-01T00:00:00.000Z" });
      const sameDate = await f.transactions.list({ to: "2026-02-10" });
      equal(
        sameDate.map((t) => t.id),
        sameDate.map((t) => t.id).sort(),
      );
    },
  ],
  [
    "valores, campos e referências inválidos não gravam",
    async ({ f, db }) => {
      const x = await fixture(f);
      for (const amountCents of [
        0,
        -1,
        0.1,
        "100",
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ]) {
        await rejects(
          () => f.transactions.create({ ...x.posting, amountCents }),
          "VALIDATION",
        );
      }
      await rejects(
        () => f.transactions.create({ ...x.posting, accountId: "missing" }),
        "NOT_FOUND",
      );
      await rejects(
        () => f.transactions.create({ ...x.posting, categoryId: "missing" }),
        "NOT_FOUND",
      );
      await rejects(
        () => f.transactions.create({ ...x.posting, categoryId: x.income.id }),
        "CATEGORY_KIND",
      );
      await rejects(
        () => f.transactions.create({ ...x.posting, date: "2026-02-31" }),
        "VALIDATION",
      );
      await rejects(
        () => f.transactions.create({ ...x.posting, date: "2025-12-31" }),
        "DATE_BEFORE_OPENING",
      );
      await rejects(
        () => f.accounts.update(x.source.id, { id: "new-id" }),
        "VALIDATION",
      );
      await rejects(
        () => f.accounts.create({ ...accountInput(), type: "credit-card" }),
        "VALIDATION",
      );
      await rejects(() => f.accounts.list(null), "VALIDATION");
      await rejects(
        () => f.categories.list({ includeArchived: "yes" }),
        "VALIDATION",
      );
      equal(await db.transactions.count(), 0);
    },
  ],
  [
    "transferência completa conserva total e não é receita/despesa",
    async ({ f }) => {
      const x = await fixture(f);
      const pair = await f.transactions.createTransfer(x.transfer);
      equal(pair.entries.length, 2);
      equal(
        pair.entries.map((row) => row.direction),
        ["out", "in"],
      );
      equal((await f.transactions.list({ type: "transfer" })).length, 2);
      equal(await f.analytics.balance(x.source.id, "2026-12-31"), 8000);
      equal(await f.analytics.balance(x.target.id, "2026-12-31"), 2000);
      equal((await f.analytics.balances("2026-12-31")).totalCents, 10000);
      equal(await f.analytics.totals(), { incomeCents: 0, expenseCents: 0 });
      equal(
        (await f.transactions.getTransfer(pair.transferId)).transferId,
        pair.transferId,
      );
      await rejects(
        () => f.transactions.update(pair.entries[0].id, { amountCents: 1 }),
        "TRANSFER_USE_API",
      );
      await rejects(
        () => f.transactions.remove(pair.entries[1].id),
        "TRANSFER_USE_API",
      );
      await rejects(() => f.accounts.remove(x.target.id), "REFERENCED");
    },
  ],
  [
    "transferência inválida e conta arquivada",
    async ({ f, db }) => {
      const x = await fixture(f);
      for (const patch of [
        { toAccountId: x.source.id },
        { amountCents: 0 },
        { amountCents: -5 },
        { date: "2026-13-01" },
        { categoryId: x.expense.id },
      ]) {
        await rejects(
          () => f.transactions.createTransfer({ ...x.transfer, ...patch }),
          "VALIDATION",
        );
      }
      await rejects(
        () =>
          f.transactions.createTransfer({
            ...x.transfer,
            toAccountId: "missing",
          }),
        "NOT_FOUND",
      );
      await f.accounts.archive(x.target.id);
      await rejects(
        () => f.transactions.createTransfer(x.transfer),
        "ARCHIVED",
      );
      equal(await db.transactions.count(), 0);
    },
  ],
  [
    "edição e exclusão da transferência preservam vínculo e IDs",
    async ({ f }) => {
      const x = await fixture(f);
      const old = await f.transactions.createTransfer(x.transfer);
      const edited = await f.transactions.updateTransfer(old.transferId, {
        amountCents: 3500,
        fromAccountId: x.target.id,
        toAccountId: x.source.id,
      });
      equal(
        edited.entries.map((t) => t.id),
        old.entries.map((t) => t.id),
      );
      equal(await f.analytics.balance(x.source.id, "2026-12-31"), 13500);
      equal(await f.analytics.balance(x.target.id, "2026-12-31"), -3500);
      await f.accounts.archive(x.source.id);
      await f.transactions.removeTransfer(old.transferId);
      equal((await f.transactions.list()).length, 0);
      equal((await f.analytics.balances("2026-12-31")).totalCents, 10000);
    },
  ],
  [
    "rollback de criação quando o segundo lado falha",
    async ({ f, db }) => {
      const x = await fixture(f);
      let attempts = 0;
      function fail(_key, row) {
        if (row.type === "transfer") {
          attempts++;
          if (row.direction === "in") throw new Error("injected-second-insert");
        }
      }
      db.transactions.hook("creating", fail);
      try {
        await rejects(
          () => f.transactions.createTransfer(x.transfer),
          "PERSISTENCE",
        );
      } finally {
        db.transactions.hook("creating").unsubscribe(fail);
      }
      equal(attempts, 2);
      equal(await db.transactions.count(), 0);
      equal((await f.analytics.balances("2026-12-31")).totalCents, 10000);
    },
  ],
  [
    "rollback de edição quando o segundo lado falha",
    async ({ f, db }) => {
      const x = await fixture(f);
      const old = await f.transactions.createTransfer(x.transfer);
      let attempts = 0;
      function fail(_mods, _key, row) {
        attempts++;
        if (row.direction === "in") throw new Error("injected-second-update");
      }
      db.transactions.hook("updating", fail);
      try {
        await rejects(
          () =>
            f.transactions.updateTransfer(old.transferId, {
              amountCents: 9999,
            }),
          "PERSISTENCE",
        );
      } finally {
        db.transactions.hook("updating").unsubscribe(fail);
      }
      equal(attempts, 2);
      equal(await f.transactions.getTransfer(old.transferId), old);
    },
  ],
  [
    "rollback de exclusão quando o segundo lado falha",
    async ({ f, db }) => {
      const x = await fixture(f);
      const old = await f.transactions.createTransfer(x.transfer);
      let attempts = 0;
      function fail(_key, row) {
        attempts++;
        if (row.direction === "in") throw new Error("injected-second-delete");
      }
      db.transactions.hook("deleting", fail);
      try {
        await rejects(
          () => f.transactions.removeTransfer(old.transferId),
          "PERSISTENCE",
        );
      } finally {
        db.transactions.hook("deleting").unsubscribe(fail);
      }
      equal(attempts, 2);
      equal(await f.transactions.getTransfer(old.transferId), old);
    },
  ],
  [
    "orçamento único, upsert concorrente e exclusão",
    async ({ f, db }) => {
      const x = await fixture(f);
      const input = {
        month: "2026-02",
        categoryId: x.expense.id,
        limitCents: 50000,
      };
      const a = await f.budgets.save(input);
      const b = await f.budgets.save({ ...input, limitCents: 70000 });
      equal(a.id, b.id);
      equal(a.createdAt, b.createdAt);
      await Promise.all([
        f.budgets.save({ ...input, limitCents: 80000 }),
        f.budgets.save({ ...input, limitCents: 90000 }),
      ]);
      equal((await f.budgets.list()).length, 1);
      await rejects(() => db.budgets.add({ ...b, id: "duplicate" }));
      await rejects(
        () => f.budgets.save({ ...input, categoryId: x.income.id }),
        "CATEGORY_KIND",
      );
      await rejects(
        () => f.budgets.save({ ...input, month: "2026-13" }),
        "VALIDATION",
      );
      await rejects(
        () => f.budgets.save({ ...input, limitCents: 0 }),
        "VALIDATION",
      );
      await f.budgets.remove(a.id);
      equal(await f.budgets.list(), []);
    },
  ],
  [
    "catálogo inicial idempotente e personalizável",
    async ({ f, db }) => {
      const result = await Promise.all([
        f.settings.initialize(),
        f.settings.initialize(),
      ]);
      equal(result.filter((r) => r.seeded).length, 1);
      equal((await f.categories.list()).length, 6);
      const first = (await f.categories.list())[0];
      await f.categories.update(first.id, { name: "Personalizada" });
      await f.settings.initialize();
      equal((await f.categories.get(first.id)).name, "Personalizada");
      equal(await db.settings.count(), 2);
    },
  ],
  [
    "falha no seed reverte categorias e marcador",
    async ({ f, db }) => {
      let calls = 0;
      function fail() {
        if (++calls === 3) throw new Error("seed-failure");
      }
      db.categories.hook("creating", fail);
      try {
        await rejects(() => f.settings.initialize(), "PERSISTENCE");
      } finally {
        db.categories.hook("creating").unsubscribe(fail);
      }
      equal(await db.categories.count(), 0);
      equal(await db.settings.count(), 0);
      equal(await f.settings.initialize(), { seeded: true });
    },
  ],
  [
    "overflow monetário reverte a escrita",
    async ({ f }) => {
      const account = await f.accounts.create({
        ...accountInput(),
        initialBalanceCents: Number.MAX_SAFE_INTEGER,
      });
      const category = await f.categories.create({
        name: "Outras",
        kind: "income",
      });
      await rejects(
        () =>
          f.transactions.create({
            description: "Excesso",
            date: "2026-01-02",
            accountId: account.id,
            categoryId: category.id,
            type: "income",
            amountCents: 1,
          }),
        "MONEY_OVERFLOW",
      );
      equal(await f.transactions.list(), []);
      equal(
        await f.analytics.balance(account.id, "2026-01-02"),
        Number.MAX_SAFE_INTEGER,
      );
    },
  ],
  [
    "dataset representativo: somas, filtros e exclusões",
    async ({ f }) => {
      const x = await fixture(f);
      for (let i = 1; i <= 30; i++) {
        await f.transactions.create({
          ...x.posting,
          date: `2026-03-${String(i).padStart(2, "0")}`,
          amountCents: i * 100,
        });
      }
      await f.transactions.create({
        ...x.posting,
        type: "income",
        categoryId: x.income.id,
        amountCents: 100000,
      });
      const transfer = await f.transactions.createTransfer(x.transfer);
      equal(await f.analytics.totals(), {
        incomeCents: 100000,
        expenseCents: 46500,
      });
      equal((await f.analytics.balances("2026-12-31")).totalCents, 63500);
      equal(
        (
          await f.transactions.list({
            from: "2026-03-10",
            to: "2026-03-20",
            type: "expense",
          })
        ).length,
        11,
      );
      await f.transactions.removeTransfer(transfer.transferId);
      equal((await f.analytics.balances("2026-12-31")).totalCents, 63500);
    },
  ],
];

async function legacyMigration(duplicate = false) {
  const name = `mf-domain-test-legacy-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(1).stores(SCHEMA_V1);
  await old.open();
  const meta = {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const data = {
    accounts: [
      {
        ...accountInput(),
        id: "legacy-account",
        archived: false,
        ...meta,
        preservedExtra: "keep",
      },
    ],
    categories: [
      {
        id: "legacy-category",
        name: "Moradia",
        kind: "expense",
        archived: false,
        ...meta,
      },
    ],
    transactions: [
      {
        id: "legacy-tx",
        description: "Aluguel",
        date: "2026-02-01",
        amountCents: 5000,
        type: "expense",
        accountId: "legacy-account",
        categoryId: "legacy-category",
        notes: "",
        ...meta,
      },
    ],
    budgets: [
      {
        id: "legacy-budget",
        month: "2026-02",
        categoryId: "legacy-category",
        limitCents: 5000,
        ...meta,
      },
    ],
    settings: [{ key: "existing-setting", value: "preserved" }],
  };
  if (duplicate)
    data.budgets.push({ ...data.budgets[0], id: "legacy-duplicate" });
  for (const [table, rows] of Object.entries(data))
    await old.table(table).bulkAdd(rows);
  await closeTestDatabase(old);
  const upgraded = createDatabase(name);
  try {
    if (duplicate) {
      await rejects(() => openDatabase(upgraded));
      await closeTestDatabase(upgraded);
      await old.open();
      equal(old.verno, 1);
      for (const [table, rows] of Object.entries(data))
        equal(await old.table(table).toArray(), rows);
    } else {
      await openDatabase(upgraded);
      equal(upgraded.verno, 2);
      for (const [table, rows] of Object.entries(data)) {
        const expected =
          table === "budgets"
            ? rows.map((row) => ({
                ...row,
                budgetKey: `${row.month}|${row.categoryId}`,
              }))
            : rows;
        equal(await upgraded.table(table).toArray(), expected);
      }
      const f = createFinance(upgraded);
      equal(await f.analytics.balance("legacy-account", "2026-12-31"), 5000);
      equal(
        (
          await f.budgets.save({
            month: "2026-02",
            categoryId: "legacy-category",
            limitCents: 6000,
          })
        ).id,
        "legacy-budget",
      );
      await closeTestDatabase(upgraded);
      await openDatabase(upgraded);
      equal(await upgraded.transactions.count(), 1);
    }
  } finally {
    await closeTestDatabase(old);
    await closeTestDatabase(upgraded);
    await Dexie.delete(name);
  }
}
scenarios.push([
  "migration V1 → V2 preserva todas as entidades e reabre",
  () => legacyMigration(false),
]);
scenarios.push([
  "migration com duplicatas aborta e preserva V1 integralmente",
  () => legacyMigration(true),
]);

scenarios.push([
  "overflow histórico não é ocultado por lançamento futuro",
  async ({ f }) => {
    const account = await f.accounts.create({
      ...accountInput(),
      initialBalanceCents: Number.MAX_SAFE_INTEGER,
    });
    const income = await f.categories.create({
      name: "Entrada",
      kind: "income",
    });
    const expense = await f.categories.create({
      name: "Saída",
      kind: "expense",
    });
    await f.transactions.create({
      description: "Futuro",
      date: "2026-03-01",
      amountCents: 100,
      type: "expense",
      accountId: account.id,
      categoryId: expense.id,
    });
    await rejects(
      () =>
        f.transactions.create({
          description: "Antes",
          date: "2026-02-01",
          amountCents: 1,
          type: "income",
          accountId: account.id,
          categoryId: income.id,
        }),
      "MONEY_OVERFLOW",
    );
    equal((await f.transactions.list()).length, 1);
  },
]);
scenarios.push([
  "edição inválida de transferência não altera nenhuma perna",
  async ({ f }) => {
    const x = await fixture(f);
    const old = await f.transactions.createTransfer(x.transfer);
    await rejects(
      () =>
        f.transactions.updateTransfer(old.transferId, {
          toAccountId: x.source.id,
        }),
      "VALIDATION",
    );
    await rejects(
      () =>
        f.transactions.updateTransfer(old.transferId, {
          toAccountId: "missing",
        }),
      "NOT_FOUND",
    );
    equal(await f.transactions.getTransfer(old.transferId), old);
  },
]);
scenarios.push([
  "arquivamento concorrente serializa com criação de lançamento",
  async ({ f }) => {
    const x = await fixture(f);
    const results = await Promise.allSettled([
      f.accounts.archive(x.source.id),
      f.transactions.create(x.posting),
    ]);
    equal(results[0].status, "fulfilled");
    if (results[1].status === "rejected")
      equal(results[1].reason.code, "ARCHIVED");
    const rows = await f.transactions.list();
    equal(rows.length, results[1].status === "fulfilled" ? 1 : 0);
    equal((await f.accounts.get(x.source.id)).archived, true);
  },
]);
scenarios.push([
  "orçamento bloqueia categoria arquivada ou inexistente",
  async ({ f }) => {
    const x = await fixture(f);
    const input = {
      month: "2026-02",
      categoryId: x.expense.id,
      limitCents: 1000,
    };
    const original = await f.budgets.save(input);
    await f.categories.archive(x.expense.id);
    await rejects(
      () => f.budgets.save({ ...input, limitCents: 2000 }),
      "ARCHIVED",
    );
    await rejects(
      () => f.budgets.save({ ...input, categoryId: "missing" }),
      "NOT_FOUND",
    );
    equal(await f.budgets.get(original.id), original);
    await f.budgets.remove(original.id);
  },
]);
scenarios.push([
  "persistência após fechar/reabrir e proteção de vínculo incompleto",
  async ({ f, db }) => {
    const x = await fixture(f);
    const pair = await f.transactions.createTransfer(x.transfer);
    await closeTestDatabase(db);
    await openDatabase(db);
    equal(await f.transactions.getTransfer(pair.transferId), pair);
    // Simulated out-of-band corruption, deliberately bypassing public services.
    await db.transactions.delete(pair.entries[1].id);
    await rejects(
      () => f.transactions.removeTransfer(pair.transferId),
      "INTEGRITY",
    );
    equal(await db.transactions.count(), 1);
  },
]);
scenarios.push([
  "migration rejeita referência órfã e mantém banco anterior",
  async () => {
    const name = `mf-domain-test-invalid-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(1).stores(SCHEMA_V1);
    await old.open();
    const row = {
      id: "orphan",
      type: "expense",
      accountId: "missing",
      categoryId: "missing",
      amountCents: 100,
      date: "2026-01-01",
      description: "Inválido",
      notes: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await old.transactions.add(row);
    await closeTestDatabase(old);
    const next = createDatabase(name);
    try {
      await rejects(() => openDatabase(next));
      await closeTestDatabase(next);
      await old.open();
      equal(old.verno, 1);
      equal(await old.transactions.toArray(), [row]);
    } finally {
      await closeTestDatabase(next);
      await closeTestDatabase(old);
      await Dexie.delete(name);
    }
  },
]);

export const scenarioNames = scenarios.map(([name]) => name);
export async function runScenario(index) {
  const db = createDatabase(`mf-domain-test-${crypto.randomUUID()}`);
  try {
    await openDatabase(db);
    await scenarios[index][1]({ db, f: createFinance(db) });
    return { name: scenarios[index][0], status: "passed", schema: db.verno };
  } finally {
    await closeTestDatabase(db);
    await db.delete();
  }
}
