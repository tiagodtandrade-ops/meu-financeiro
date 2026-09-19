import { requireDomain } from "../utils/errors.js";
import { isISODate, monthInterval } from "../utils/dates.js";
import { assertCents } from "../utils/money.js";

export const ACCOUNT_TYPES = ["checking", "savings", "cash", "other"];
export const KINDS = ["income", "expense"];
export function objectInput(value, allowed) {
  requireDomain(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "VALIDATION",
    "Informe um objeto válido.",
  );
  requireDomain(
    Object.keys(value).every((key) => allowed.includes(key)),
    "VALIDATION",
    "Campo desconhecido ou imutável.",
  );
}
export function text(value, field, max = 200, optional = false) {
  if (optional && value === undefined) return "";
  requireDomain(
    typeof value === "string" &&
      value.trim().length <= max &&
      (optional || value.trim().length > 0),
    "VALIDATION",
    `${field} inválido.`,
  );
  return value.trim();
}
export function choice(value, choices, field) {
  requireDomain(choices.includes(value), "VALIDATION", `${field} inválido.`);
  return value;
}
export function date(value) {
  requireDomain(isISODate(value), "VALIDATION", "Data civil inválida.");
  return value;
}
export function cents(value, positive = false) {
  let valid = true;
  try {
    assertCents(value);
  } catch {
    valid = false;
  }
  requireDomain(
    valid && (!positive || value > 0),
    "VALIDATION",
    positive
      ? "Informe centavos inteiros maiores que zero."
      : "Informe centavos inteiros seguros.",
  );
  return value;
}
export function month(value) {
  let valid = true;
  try {
    monthInterval(value);
  } catch {
    valid = false;
  }
  requireDomain(valid, "VALIDATION", "Mês inválido; use YYYY-MM.");
  return value;
}
const decoration = (input) => ({
  color: text(input.color, "Cor", 40, true),
  icon: text(input.icon, "Ícone", 80, true),
});
export const accountFields = [
  "name",
  "type",
  "initialBalanceCents",
  "initialBalanceDate",
  "color",
  "icon",
];
export function accountData(input) {
  return {
    name: text(input.name, "Nome"),
    type: choice(input.type, ACCOUNT_TYPES, "Tipo de conta"),
    initialBalanceCents: cents(input.initialBalanceCents),
    initialBalanceDate: date(input.initialBalanceDate),
    ...decoration(input),
  };
}
export const categoryFields = ["name", "kind", "color", "icon"];
export function categoryData(input) {
  return {
    name: text(input.name, "Nome"),
    kind: choice(input.kind, KINDS, "Tipo de categoria"),
    ...decoration(input),
  };
}
export const transactionFields = [
  "description",
  "date",
  "amountCents",
  "type",
  "accountId",
  "categoryId",
  "notes",
];
export function transactionData(input) {
  return {
    description: text(input.description, "Descrição"),
    date: date(input.date),
    amountCents: cents(input.amountCents, true),
    type: choice(input.type, KINDS, "Tipo de lançamento"),
    accountId: text(input.accountId, "Conta"),
    categoryId: text(input.categoryId, "Categoria"),
    notes: text(input.notes, "Observações", 2000, true),
  };
}
export const transferFields = [
  "description",
  "date",
  "amountCents",
  "fromAccountId",
  "toAccountId",
  "notes",
];
export function transferData(input) {
  const result = {
    description: text(input.description, "Descrição"),
    date: date(input.date),
    amountCents: cents(input.amountCents, true),
    fromAccountId: text(input.fromAccountId, "Conta de origem"),
    toAccountId: text(input.toAccountId, "Conta de destino"),
    notes: text(input.notes, "Observações", 2000, true),
  };
  requireDomain(
    result.fromAccountId !== result.toAccountId,
    "VALIDATION",
    "Origem e destino devem ser contas diferentes.",
  );
  return result;
}
export const budgetFields = ["month", "categoryId", "limitCents"];
export function budgetData(input) {
  const result = {
    month: month(input.month),
    categoryId: text(input.categoryId, "Categoria"),
    limitCents: cents(input.limitCents, true),
  };
  return { ...result, budgetKey: `${result.month}|${result.categoryId}` };
}
