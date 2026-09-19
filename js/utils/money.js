export function assertCents(value) {
  if (!Number.isSafeInteger(value))
    throw new TypeError(
      "Valor monetário deve ser um inteiro seguro em centavos.",
    );
  return value;
}
export function formatBRL(cents) {
  assertCents(cents);
  const absolute = BigInt(cents < 0 ? -cents : cents);
  const whole = absolute / 100n;
  const signedWhole = cents < 0 ? (whole === 0n ? -0 : -whole) : whole;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .formatToParts(signedWhole)
    .map((part) =>
      part.type === "fraction"
        ? String(absolute % 100n).padStart(2, "0")
        : part.value,
    )
    .join("");
}

// Grammar: optional minus, BR grouping, comma with exactly two decimals.
// Reject whitespace inside the number, currency symbols and ambiguous decimals.
export function parseBRLToCents(value) {
  if (typeof value !== "string")
    throw new TypeError("Informe um valor monetário em texto.");
  const text = value.trim();
  if (!/^-?(?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{2})?$/.test(text)) {
    throw new TypeError("Use o formato 1.234,56, sem símbolo de moeda.");
  }
  const negative = text.startsWith("-");
  const [integer, fraction = "00"] = text
    .replace("-", "")
    .replaceAll(".", "")
    .split(",");
  const cents = BigInt(integer) * 100n + BigInt(fraction);
  return safeBigInt(negative ? -cents : cents);
}
function safeBigInt(value) {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError("Valor monetário excede o intervalo seguro.");
  }
  return Number(value);
}
export function sumCents(values) {
  return safeBigInt(
    values.reduce((total, value) => total + BigInt(assertCents(value)), 0n),
  );
}
export function addCents(a, b) {
  return sumCents([a, b]);
}
export function subtractCents(a, b) {
  return sumCents([a, -assertCents(b)]);
}
