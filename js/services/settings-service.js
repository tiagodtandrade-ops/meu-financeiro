import { INITIAL_CATEGORIES } from "../db/seed.js";
import { categoryData } from "../models/contracts.js";
import { requireDomain } from "../utils/errors.js";

export function createSettingsService(r) {
  return {
    get: () =>
      r.atomic(
        "r",
        async () =>
          (await r.settings.get("preferences")) ?? {
            key: "preferences",
            currency: "BRL",
            locale: "pt-BR",
          },
      ),
    initialize: () =>
      r.atomic("rw", async () => {
        const marker = await r.settings.get("initial-categories-v1");
        if (marker) return { seeded: false };
        const now = new Date().toISOString();
        for (const item of INITIAL_CATEGORIES) {
          requireDomain(
            !(await r.categories.get(item.id)),
            "SEED_CONFLICT",
            "Catálogo inicial já ocupa um identificador reservado. Nenhum dado foi sobrescrito.",
          );
          await r.categories.add({
            ...categoryData(item),
            id: item.id,
            archived: false,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (!(await r.settings.get("preferences")))
          await r.settings.add({
            key: "preferences",
            currency: "BRL",
            locale: "pt-BR",
            createdAt: now,
            updatedAt: now,
          });
        await r.settings.add({
          key: "initial-categories-v1",
          completedAt: now,
        });
        return { seeded: true };
      }),
  };
}
