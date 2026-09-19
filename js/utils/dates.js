// Gregorian civil dates, years 0001–9999, without timezone conversion.
export function isISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function todayLocalISO(now = new Date()) {
  const y = String(now.getFullYear()).padStart(4, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const value = `${y}-${m}-${d}`;
  if (!isISODate(value)) throw new TypeError("Data civil inválida.");
  return value;
}

export function formatISODateBR(value) {
  if (!isISODate(value)) {
    throw new TypeError(
      "Data civil deve existir e usar YYYY-MM-DD, anos 0001 a 9999.",
    );
  }
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function monthInterval(month) {
  if (
    typeof month !== "string" ||
    !/^\d{4}-\d{2}$/.test(month) ||
    !isISODate(`${month}-01`)
  ) {
    throw new TypeError("Mês deve usar YYYY-MM, anos 0001 a 9999.");
  }
  let day = 31;
  while (!isISODate(`${month}-${day}`)) day--;
  return { from: `${month}-01`, to: `${month}-${day}` };
}
export function compareDatedRecords(a, b) {
  for (const field of ["date", "createdAt", "id"]) {
    const left = a[field] ?? "",
      right = b[field] ?? "";
    if (left < right) return -1;
    if (left > right) return 1;
  }
  return 0;
}
