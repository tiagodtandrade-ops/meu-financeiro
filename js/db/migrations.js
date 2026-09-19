import { validateBalanceTimeline } from "../models/ledger.js";
import { SCHEMA_V1, SCHEMA_V2 } from "./schema.js";
import { DomainError, requireDomain } from "../utils/errors.js";
import {
  accountData,
  categoryData,
  transactionData,
  transferData,
  budgetData,
  text,
} from "../models/contracts.js";

function validateLegacy(records) {
  const accounts = new Map(records.accounts.map((row) => [row.id, row]));
  const categories = new Map(records.categories.map((row) => [row.id, row]));
  const transfers = new Map();
  for (const table of ["accounts", "categories", "transactions", "budgets"]) {
    for (const row of records[table]) {
      text(row.id, "ID");
      for (const field of ["createdAt", "updatedAt"]) {
        requireDomain(
          typeof row[field] === "string" &&
            /^\d{4}-\d{2}-\d{2}T/.test(row[field]) &&
            Number.isFinite(Date.parse(row[field])),
          "MIGRATION_INVALID",
          "Timestamp legado inválido.",
        );
      }
    }
  }
  for (const row of records.accounts) {
    accountData(row);
    requireDomain(
      typeof row.archived === "boolean",
      "MIGRATION_INVALID",
      "Estado legado de conta inválido.",
    );
  }
  for (const row of records.categories) {
    categoryData(row);
    requireDomain(
      typeof row.archived === "boolean",
      "MIGRATION_INVALID",
      "Estado legado de categoria inválido.",
    );
  }
  for (const row of records.transactions) {
    const account = accounts.get(row.accountId);
    requireDomain(
      account && row.date >= account.initialBalanceDate,
      "MIGRATION_INVALID",
      "Referência ou data de conta legada inválida.",
    );
    if (row.type === "transfer") {
      text(row.transferId, "Vínculo da transferência");
      requireDomain(
        ["out", "in"].includes(row.direction) && row.categoryId === undefined,
        "MIGRATION_INVALID",
        "Direção ou categoria de transferência inválida.",
      );
      if (!transfers.has(row.transferId)) transfers.set(row.transferId, []);
      transfers.get(row.transferId).push(row);
    } else {
      transactionData(row);
      requireDomain(
        categories.get(row.categoryId)?.kind === row.type &&
          row.transferId === undefined &&
          row.direction === undefined,
        "MIGRATION_INVALID",
        "Categoria ou vínculo legado inválido.",
      );
    }
  }
  for (const rows of transfers.values()) {
    const outgoing = rows.find((row) => row.direction === "out");
    const incoming = rows.find((row) => row.direction === "in");
    requireDomain(
      rows.length === 2 &&
        outgoing &&
        incoming &&
        ["date", "description", "notes", "amountCents"].every(
          (key) => outgoing[key] === incoming[key],
        ),
      "MIGRATION_INVALID",
      "Transferência legada incompleta ou divergente.",
    );
    transferData({
      ...outgoing,
      fromAccountId: outgoing.accountId,
      toAccountId: incoming.accountId,
    });
  }
  validateBalanceTimeline(records.accounts, records.transactions);
  const keys = new Set();
  for (const row of records.budgets) {
    const { budgetKey } = budgetData(row);
    requireDomain(
      categories.get(row.categoryId)?.kind === "expense",
      "MIGRATION_INVALID",
      "Categoria de orçamento legado inválida.",
    );
    requireDomain(
      !keys.has(budgetKey),
      "MIGRATION_CONFLICT",
      "Há orçamentos duplicados na versão anterior.",
    );
    keys.add(budgetKey);
  }
}
export function registerMigrations(db) {
  db.version(1).stores(SCHEMA_V1);
  db.version(2)
    .stores(SCHEMA_V2)
    .upgrade(async (tx) => {
      const records = {};
      for (const table of ["accounts", "categories", "transactions", "budgets"])
        records[table] = await tx.table(table).toArray();
      try {
        validateLegacy(records);
      } catch (cause) {
        throw new DomainError(
          "MIGRATION_INVALID",
          "A atualização foi cancelada: dados legados incompatíveis. Nenhum registro foi apagado.",
          { cause },
        );
      }
      for (const row of records.budgets) {
        await tx
          .table("budgets")
          .update(row.id, { budgetKey: `${row.month}|${row.categoryId}` });
      }
    });
  return db;
}
