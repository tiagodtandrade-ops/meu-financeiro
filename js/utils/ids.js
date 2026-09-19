export function createId() {
  if (!globalThis.crypto?.randomUUID)
    throw new Error(
      "Este navegador não oferece suporte a IDs seguros via crypto.randomUUID().",
    );
  return globalThis.crypto.randomUUID();
}
