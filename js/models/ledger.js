import { requireDomain } from "../utils/errors.js";

export function signedAmount(record) {
  if (record.type === "income") return record.amountCents;
  if (record.type === "expense") return -record.amountCents;
  requireDomain(
    record.type === "transfer" && ["in", "out"].includes(record.direction),
    "INTEGRITY",
    "Lançamento com direção inválida.",
  );
  return record.direction === "in" ? record.amountCents : -record.amountCents;
}
export function validateBalanceTimeline(accounts, records) {
  // Validate every end-of-day balance, not only the final balance: a later
  // expense must not conceal an earlier overflow. Two transfer legs share a day.
  const days = new Map();
  function event(day, accountId, amount) {
    if (!days.has(day)) days.set(day, new Map());
    const changes = days.get(day);
    changes.set(accountId, (changes.get(accountId) ?? 0n) + BigInt(amount));
  }
  for (const account of accounts)
    event(account.initialBalanceDate, account.id, account.initialBalanceCents);
  for (const row of records) event(row.date, row.accountId, signedAmount(row));
  const balances = new Map();
  let total = 0n;
  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  const safe = (amount) =>
    requireDomain(
      amount >= -maximum && amount <= maximum,
      "MONEY_OVERFLOW",
      "Um saldo por data ultrapassa o intervalo seguro em centavos.",
    );
  for (const day of [...days.keys()].sort()) {
    for (const [id, amount] of days.get(day)) {
      const balance = (balances.get(id) ?? 0n) + amount;
      safe(balance);
      balances.set(id, balance);
      total += amount;
    }
    safe(total);
  }
}
