import { budgetData, budgetFields, objectInput } from "../models/contracts.js";
import { requireDomain } from "../utils/errors.js";
import { active, existing, stamp, changed } from "./shared.js";

export function createBudgetService(r) {
  return {
    // Upsert by category/month. Repeated and concurrent saves retain one ID.
    save: (input) =>
      r.atomic("rw", async () => {
        objectInput(input, budgetFields);
        const data = budgetData(input);
        const category = await active(
          r.categories,
          data.categoryId,
          "Categoria",
        );
        requireDomain(
          category.kind === "expense",
          "CATEGORY_KIND",
          "Orçamento requer categoria de despesa.",
        );
        const [old] = await r.budgets.where("budgetKey", data.budgetKey);
        const record = old ? changed(old, data) : { ...data, ...stamp() };
        await r.budgets.put(record);
        return record;
      }),
    get: (id) => r.atomic("r", () => existing(r.budgets, id, "Orçamento")),
    list: () =>
      r.atomic("r", async () =>
        (await r.budgets.all()).sort((a, b) =>
          a.budgetKey.localeCompare(b.budgetKey),
        ),
      ),
    remove: (id) =>
      r.atomic("rw", async () => {
        await existing(r.budgets, id, "Orçamento");
        await r.budgets.remove(id);
      }),
  };
}
