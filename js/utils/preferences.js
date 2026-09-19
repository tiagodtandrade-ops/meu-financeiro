// Optional UI preferences only. Never use this fallback for financial data.
export function readTheme(getStorage = () => globalThis.localStorage) {
  try {
    return getStorage().getItem("mf-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(theme, getStorage = () => globalThis.localStorage) {
  try {
    getStorage().setItem("mf-theme", theme);
    return true;
  } catch {
    return false;
  }
}
