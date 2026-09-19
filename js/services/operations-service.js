// Presentation adapter: filtering and ordering remain owned by the domain service.
// A matching incoming leg must still display the complete transfer.
export async function listOperations(api, filters = {}) {
  const rows = await api.transactions.list(filters);
  const seen = new Set();
  const result = [];
  for (const row of rows) {
    if (row.type !== "transfer") {
      result.push(row);
    } else if (!seen.has(row.transferId)) {
      seen.add(row.transferId);
      const { entries } = await api.transactions.getTransfer(row.transferId);
      const source = entries.find((item) => item.direction === "out");
      const destination = entries.find((item) => item.direction === "in");
      result.push({
        ...source,
        fromAccountId: source.accountId,
        toAccountId: destination.accountId,
      });
    }
  }
  return result;
}
