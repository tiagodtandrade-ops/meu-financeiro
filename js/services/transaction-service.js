import {
  transactionData,
  transactionFields,
  transferData,
  transferFields,
  objectInput,
  date,
  text,
  choice,
} from "../models/contracts.js";
import { requireDomain } from "../utils/errors.js";
import { compareDatedRecords } from "../utils/dates.js";
import { createId } from "../utils/ids.js";
import {
  stamp,
  changed,
  existing,
  active,
  postingDate,
  ensureSafeBalances,
} from "./shared.js";

export function normalizeFilters(input = {}) {
  objectInput(input, ["from", "to", "accountId", "categoryId", "type", "text"]);
  const filter = {};
  if (input.from !== undefined) filter.from = date(input.from);
  if (input.to !== undefined) filter.to = date(input.to);
  requireDomain(
    !filter.from || !filter.to || filter.from <= filter.to,
    "VALIDATION",
    "Intervalo de datas invertido.",
  );
  for (const key of ["accountId", "categoryId"])
    if (input[key] !== undefined) filter[key] = text(input[key], key);
  if (input.type !== undefined)
    filter.type = choice(input.type, ["income", "expense", "transfer"], "Tipo");
  if (input.text !== undefined)
    filter.text = text(input.text, "Busca", 2000, true);
  return filter;
}
const searchable = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function filterRecords(records, filters = {}) {
  const f = normalizeFilters(filters);
  return records
    .filter(
      (item) =>
        (!f.from || item.date >= f.from) &&
        (!f.to || item.date <= f.to) &&
        (!f.accountId || item.accountId === f.accountId) &&
        (!f.categoryId || item.categoryId === f.categoryId) &&
        (!f.type || item.type === f.type) &&
        (!f.text ||
          searchable(`${item.description} ${item.notes ?? ""}`).includes(
            searchable(f.text),
          )),
    )
    .sort(compareDatedRecords);
}
export function createTransactionService(r) {
  async function validatePosting(record) {
    const account = await active(r.accounts, record.accountId, "Conta");
    const category = await active(r.categories, record.categoryId, "Categoria");
    requireDomain(
      category.kind === record.type,
      "CATEGORY_KIND",
      "Categoria incompatível com o tipo de lançamento.",
    );
    postingDate(account, record.date);
  }
  async function validateTransfer(input) {
    const source = await active(
      r.accounts,
      input.fromAccountId,
      "Conta de origem",
    );
    const destination = await active(
      r.accounts,
      input.toAccountId,
      "Conta de destino",
    );
    postingDate(source, input.date);
    postingDate(destination, input.date);
  }
  async function pair(id) {
    text(id, "Transferência");
    const rows = await r.transactions.where("transferId", id);
    requireDomain(
      rows.length > 0,
      "NOT_FOUND",
      "Transferência não encontrada.",
    );
    const outgoing = rows.find((row) => row.direction === "out");
    const incoming = rows.find((row) => row.direction === "in");
    requireDomain(
      rows.length === 2 &&
        outgoing &&
        incoming &&
        outgoing.accountId !== incoming.accountId &&
        rows.every(
          (row) => row.type === "transfer" && row.categoryId === undefined,
        ) &&
        ["amountCents", "date", "description", "notes"].every(
          (key) => outgoing[key] === incoming[key],
        ),
      "INTEGRITY",
      "Transferência inconsistente; operação cancelada.",
    );
    return { transferId: id, entries: [outgoing, incoming] };
  }
  function legFields(input, direction, transferId) {
    return {
      type: "transfer",
      transferId,
      direction,
      accountId: direction === "out" ? input.fromAccountId : input.toAccountId,
      amountCents: input.amountCents,
      date: input.date,
      description: input.description,
      notes: input.notes,
    };
  }
  return {
    create: (input) =>
      r.atomic("rw", async () => {
        objectInput(input, transactionFields);
        const record = { ...transactionData(input), ...stamp() };
        await validatePosting(record);
        await r.transactions.add(record);
        await ensureSafeBalances(r);
        return record;
      }),
    get: (id) =>
      r.atomic("r", () => existing(r.transactions, id, "Lançamento")),
    list: (filters) =>
      r.atomic("r", async () =>
        filterRecords(await r.transactions.all(), filters),
      ),
    update: (id, patch) =>
      r.atomic("rw", async () => {
        objectInput(patch, transactionFields);
        const old = await existing(r.transactions, id, "Lançamento");
        requireDomain(
          old.type !== "transfer",
          "TRANSFER_USE_API",
          "Edite a transferência completa, não um lado isolado.",
        );
        const record = changed(old, transactionData({ ...old, ...patch }));
        await validatePosting(record);
        await r.transactions.put(record);
        await ensureSafeBalances(r);
        return record;
      }),
    remove: (id) =>
      r.atomic("rw", async () => {
        const record = await existing(r.transactions, id, "Lançamento");
        requireDomain(
          record.type !== "transfer",
          "TRANSFER_USE_API",
          "Exclua a transferência completa, não um lado isolado.",
        );
        await r.transactions.remove(id);
        await ensureSafeBalances(r);
      }),
    createTransfer: (input) =>
      r.atomic("rw", async () => {
        objectInput(input, transferFields);
        const data = transferData(input);
        await validateTransfer(data);
        const transferId = createId(),
          timestamps = stamp();
        const outgoing = {
          ...timestamps,
          ...legFields(data, "out", transferId),
        };
        const incoming = {
          ...timestamps,
          id: createId(),
          ...legFields(data, "in", transferId),
        };
        await r.transactions.add(outgoing);
        await r.transactions.add(incoming);
        await ensureSafeBalances(r);
        return { transferId, entries: [outgoing, incoming] };
      }),
    getTransfer: (id) => r.atomic("r", () => pair(id)),
    updateTransfer: (id, patch) =>
      r.atomic("rw", async () => {
        objectInput(patch, transferFields);
        const old = await pair(id);
        const [outgoing, incoming] = old.entries;
        const data = transferData({
          description: outgoing.description,
          notes: outgoing.notes,
          date: outgoing.date,
          amountCents: outgoing.amountCents,
          fromAccountId: outgoing.accountId,
          toAccountId: incoming.accountId,
          ...patch,
        });
        await validateTransfer(data);
        const updatedAt = new Date().toISOString();
        const entries = [outgoing, incoming].map((row) => ({
          ...row,
          ...legFields(data, row.direction, id),
          updatedAt,
        }));
        for (const row of entries) await r.transactions.put(row);
        await ensureSafeBalances(r);
        return { transferId: id, entries };
      }),
    removeTransfer: (id) =>
      r.atomic("rw", async () => {
        const { entries } = await pair(id);
        for (const row of entries) await r.transactions.remove(row.id);
        await ensureSafeBalances(r);
      }),
  };
}
