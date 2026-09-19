import { db, openDatabase } from "../db/database.js";
import { createFinance } from "./index.js";

// One database and one public API per page session. Retry never resets data.
export const finance = createFinance(db);
let pending;
export const session = { status: "loading", error: null };
const listeners = new Set();
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function notify() {
  for (const listener of listeners) listener();
}
export function initialize() {
  if (pending) return pending;
  session.status = "loading";
  session.error = null;
  notify();
  pending = (async () => {
    try {
      await openDatabase(db);
      await finance.settings.initialize();
      session.status = "ready";
    } catch (error) {
      session.status = "error";
      session.error = error;
    } finally {
      pending = null;
      notify();
    }
  })();
  return pending;
}
