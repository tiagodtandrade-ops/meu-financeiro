export function requiredText(value, label = "Campo") {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${label} é obrigatório.`);
  return normalized;
}
