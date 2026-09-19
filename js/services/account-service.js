import {
  accountData,
  accountFields,
  objectInput,
} from "../models/contracts.js";
import { requireDomain } from "../utils/errors.js";
import { stamp, changed, existing, ensureSafeBalances } from "./shared.js";

export function createAccountService(r) {
  return {
    create: (input) =>
      r.atomic("rw", async () => {
        objectInput(input, accountFields);
        const record = { ...accountData(input), ...stamp(), archived: false };
        await r.accounts.add(record);
        await ensureSafeBalances(r);
        return record;
      }),
    list: (options = {}) =>
      r.atomic("r", async () => {
        objectInput(options, ["includeArchived"]);
        const includeArchived = options.includeArchived ?? true;
        requireDomain(
          options.includeArchived === undefined ||
            typeof options.includeArchived === "boolean",
          "VALIDATION",
          "Filtro de arquivamento inválido.",
        );
        return (await r.accounts.all())
          .filter((item) => includeArchived || !item.archived)
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id),
          );
      }),
    get: (id) => r.atomic("r", () => existing(r.accounts, id, "Conta")),
    update: (id, patch) =>
      r.atomic("rw", async () => {
        objectInput(patch, accountFields);
        const old = await existing(r.accounts, id, "Conta");
        const record = changed(old, accountData({ ...old, ...patch }));
        requireDomain(
          (await r.transactions.where("accountId", id)).every(
            (item) => item.date >= record.initialBalanceDate,
          ),
          "DATE_BEFORE_OPENING",
          "A data inicial excluiria lançamentos existentes.",
        );
        await r.accounts.put(record);
        await ensureSafeBalances(r);
        return record;
      }),
    archive: (id, archived = true) =>
      r.atomic("rw", async () => {
        requireDomain(
          typeof archived === "boolean",
          "VALIDATION",
          "Estado de arquivamento inválido.",
        );
        const record = changed(await existing(r.accounts, id, "Conta"), {
          archived,
        });
        await r.accounts.put(record);
        return record;
      }),
    remove: (id) =>
      r.atomic("rw", async () => {
        await existing(r.accounts, id, "Conta");
        requireDomain(
          (await r.transactions.where("accountId", id)).length === 0,
          "REFERENCED",
          "Conta possui histórico. Arquive-a em vez de excluir.",
        );
        await r.accounts.remove(id);
        await ensureSafeBalances(r);
      }),
  };
}
