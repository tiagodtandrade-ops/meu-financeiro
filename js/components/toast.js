import { el } from "../utils/dom.js";
export function createToastRegion() {
  return el("div", {
    className: "toast-region",
    "aria-live": "polite",
    "aria-atomic": "true",
  });
}
export function showToast(region, message) {
  const toast = el("div", {
    className: "toast",
    role: "status",
    text: message,
  });
  region.append(toast);
  setTimeout(() => toast.remove(), 3200);
}
