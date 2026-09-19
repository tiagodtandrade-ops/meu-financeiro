import { date } from "../models/contracts.js";
import { todayLocalISO } from "../utils/dates.js";
import { existing, safeSum, signedAmount } from "./shared.js";
import { filterRecords } from "./transaction-service.js";

export function createAnalyticsService(r) {
  function balance(account, records, asOf) {
    if (account.initialBalanceDate > asOf) return 0;
    return safeSum([
      account.initialBalanceCents,
      ...records
        .filter((row) => row.accountId === account.id && row.date <= asOf)
        .map(signedAmount),
    ]);
  }
  return {
    balance: (accountId, asOf = todayLocalISO()) =>
      r.atomic("r", async () => {
        date(asOf);
        const account = await existing(r.accounts, accountId, "Conta");
        return balance(
          account,
          await r.transactions.where("accountId", accountId),
          asOf,
        );
      }),
    balances: (asOf = todayLocalISO()) =>
      r.atomic("r", async () => {
        date(asOf);
        const accounts = await r.accounts.all(),
          records = await r.transactions.all();
        const byAccount = accounts.map((account) => ({
          accountId: account.id,
          balanceCents: balance(account, records, asOf),
        }));
        return {
          asOf,
          byAccount,
          totalCents: safeSum(byAccount.map((item) => item.balanceCents)),
        };
      }),
    totals: (filters) =>
      r.atomic("r", async () => {
        const records = filterRecords(await r.transactions.all(), filters);
        return {
          incomeCents: safeSum(
            records
              .filter((row) => row.type === "income")
              .map((row) => row.amountCents),
          ),
          expenseCents: safeSum(
            records
              .filter((row) => row.type === "expense")
              .map((row) => row.amountCents),
          ),
        };
      }),
  };
}
