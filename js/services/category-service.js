import {
  categoryData,
  categoryFields,
  objectInput,
} from "../models/contracts.js";
import { requireDomain } from "../utils/errors.js";
import { stamp, changed, existing } from "./shared.js";

export function createCategoryService(r) {
  const referenced = async (id) =>
    (await r.transactions.where("categoryId", id)).length > 0 ||
    (await r.budgets.where("categoryId", id)).length > 0;
  return {
    create: (input) =>
      r.atomic("rw", async () => {
        objectInput(input, categoryFields);
        const record = { ...categoryData(input), ...stamp(), archived: false };
        await r.categories.add(record);
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
        return (await r.categories.all())
          .filter((item) => includeArchived || !item.archived)
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id),
          );
      }),
    get: (id) => r.atomic("r", () => existing(r.categories, id, "Categoria")),
    update: (id, patch) =>
      r.atomic("rw", async () => {
        objectInput(patch, categoryFields);
        const old = await existing(r.categories, id, "Categoria");
        const record = changed(old, categoryData({ ...old, ...patch }));
        requireDomain(
          record.kind === old.kind || !(await referenced(id)),
          "REFERENCED",
          "Não altere o tipo de uma categoria com histórico ou orçamento.",
        );
        await r.categories.put(record);
        return record;
      }),
    archive: (id, archived = true) =>
      r.atomic("rw", async () => {
        requireDomain(
          typeof archived === "boolean",
          "VALIDATION",
          "Estado de arquivamento inválido.",
        );
        const record = changed(await existing(r.categories, id, "Categoria"), {
          archived,
        });
        await r.categories.put(record);
        return record;
      }),
    remove: (id) =>
      r.atomic("rw", async () => {
        await existing(r.categories, id, "Categoria");
        requireDomain(
          !(await referenced(id)),
          "REFERENCED",
          "Categoria possui histórico ou orçamento. Arquive-a em vez de excluir.",
        );
        await r.categories.remove(id);
      }),
  };
}
