import { DomainError } from "../utils/errors.js";

// All table access and transaction boundaries live in this layer.
export function createRepositories(database) {
  const names = [
    "accounts",
    "categories",
    "transactions",
    "budgets",
    "settings",
  ];
  const result = {};
  for (const name of names) {
    const table = database.table(name);
    result[name] = {
      get: (id) => table.get(id),
      all: () => table.toArray(),
      where: (index, value) => table.where(index).equals(value).toArray(),
      add: (value) => table.add(value),
      put: (value) => table.put(value),
      remove: (id) => table.delete(id),
    };
  }
  result.atomic = async (mode, work) => {
    try {
      return await database.transaction(
        mode,
        names.map((name) => database.table(name)),
        work,
      );
    } catch (cause) {
      if (cause instanceof DomainError) throw cause;
      throw new DomainError(
        "PERSISTENCE",
        "Não foi possível concluir a operação local. Nenhuma alteração parcial foi salva.",
        { cause },
      );
    }
  };
  return result;
}
