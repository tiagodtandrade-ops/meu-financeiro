// A Dexie read request may resolve before its native transaction completes.
// An empty readwrite transaction covering every store waits behind all earlier
// reads/writes on this connection. Its complete event is the cleanup barrier;
// there are no data writes, timers, warning filters, or retries here.
export async function closeTestDatabase(database) {
  const native = database.backendDB();
  try {
    if (native?.objectStoreNames.length) {
      await new Promise((resolve, reject) => {
        const transaction = native.transaction(
          [...native.objectStoreNames],
          "readwrite",
        );
        transaction.addEventListener("complete", resolve, { once: true });
        transaction.addEventListener(
          "abort",
          () =>
            reject(transaction.error || new Error("Cleanup barrier aborted")),
          { once: true },
        );
      });
    }
  } finally {
    database.close();
  }
}
