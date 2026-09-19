import { el } from "../utils/dom.js";
export function pageHeader(title, subtitle, action) {
  const copy = el("div", {}, [
    el("p", { className: "eyebrow", text: "Meu Financeiro" }),
    el("h1", { className: "page-title", text: title }),
    el("p", { className: "page-subtitle", text: subtitle }),
  ]);
  return el(
    "header",
    { className: "page-header" },
    action ? [copy, action] : [copy],
  );
}
