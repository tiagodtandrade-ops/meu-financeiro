import { validateBalanceTimeline } from "../models/ledger.js";
import { requireDomain, DomainError } from "../utils/errors.js";
import { createId } from "../utils/ids.js";
import { sumCents } from "../utils/money.js";

export function stamp() {
  const now = new Date().toISOString();
  return { id: createId(), createdAt: now, updatedAt: now };
}
export function changed(record, fields) {
  return { ...record, ...fields, updatedAt: new Date().toISOString() };
}
export async function existing(repository, id, label) {
  requireDomain(
    typeof id === "string" && id.length > 0,
    "VALIDATION",
    `${label} inválido.`,
  );
  const record = await repository.get(id);
  requireDomain(record, "NOT_FOUND", `${label} não encontrado.`);
  return record;
}
export async function active(repository, id, label) {
  const record = await existing(repository, id, label);
  requireDomain(
    record.archived === false,
    "ARCHIVED",
    `${label} arquivado ou sem estado válido.`,
  );
  return record;
}
export function postingDate(account, date) {
  requireDomain(
    date >= account.initialBalanceDate,
    "DATE_BEFORE_OPENING",
    "Lançamento anterior à data do saldo inicial.",
  );
}
export function safeSum(values) {
  try {
    return sumCents(values);
  } catch (cause) {
    throw new DomainError(
      "MONEY_OVERFLOW",
      "O cálculo ultrapassa o intervalo seguro em centavos.",
      { cause },
    );
  }
}
export { signedAmount } from "../models/ledger.js";
export async function ensureSafeBalances(repositories) {
  validateBalanceTimeline(
    await repositories.accounts.all(),
    await repositories.transactions.all(),
  );
}
