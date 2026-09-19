export const DB_NAME = "meu-financeiro";
export const SCHEMA_V1 = {
  accounts: "&id, name, type, archived, createdAt",
  categories: "&id, name, kind, archived, createdAt",
  transactions:
    "&id, date, type, accountId, categoryId, transferId, createdAt, updatedAt",
  budgets: "&id, [month+categoryId], month, categoryId, createdAt, updatedAt",
  settings: "&key",
};

// V1 remains immutable. V2 introduces enforceable logical uniqueness.
export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  transactions:
    "&id, date, type, accountId, categoryId, transferId, &[transferId+direction], createdAt, updatedAt",
  budgets:
    "&id, [month+categoryId], &budgetKey, month, categoryId, createdAt, updatedAt",
};
