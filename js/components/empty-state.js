import { el } from "../utils/dom.js";
export function emptyState({
  icon = "○",
  title,
  description,
  actionLabel,
  onAction,
}) {
  const children = [
    el("div", { className: "empty-icon", "aria-hidden": "true", text: icon }),
    el("h2", { text: title }),
    el("p", { text: description }),
  ];
  if (actionLabel)
    children.push(
      el("button", {
        className: "btn btn-primary",
        type: "button",
        text: actionLabel,
        onClick: onAction ?? (() => {}),
      }),
    );
  return el("div", { className: "empty-state" }, children);
}
