import Dexie from "../../vendor/dexie.mjs";
import { DB_NAME } from "./schema.js";
import { registerMigrations } from "./migrations.js";

export function createDatabase(name = DB_NAME) {
  return registerMigrations(new Dexie(name));
}
export const db = createDatabase();

// Caller must await and communicate failure; no preference-style fallback here.
export async function openDatabase(database = db) {
  try {
    await database.open();
    return database;
  } catch (cause) {
    throw new Error(
      "Não foi possível abrir o banco local. Verifique as permissões do navegador.",
      { cause },
    );
  }
}
