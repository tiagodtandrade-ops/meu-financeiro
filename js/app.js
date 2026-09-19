import { el } from "./utils/dom.js";
import { button, errorText } from "./components/operation-form.js";
import { initialize, session, subscribe } from "./services/finance-session.js";
import { appShell } from "./components/app-shell.js";
import { createRouter } from "./router.js";
import { createToastRegion, showToast } from "./components/toast.js";
import { readTheme, saveTheme } from "./utils/preferences.js";

const mount = document.querySelector("#app");
const { root, view } = appShell();
const toasts = createToastRegion();
mount.replaceChildren(root, toasts);
const databaseStatus = el("div", {
  className: "database-status",
  role: "status",
  "aria-live": "polite",
});
view.before(databaseStatus);
subscribe(() => {
  databaseStatus.hidden = session.status === "ready";
  databaseStatus.replaceChildren();
  if (session.status === "loading")
    databaseStatus.textContent = "Conectando ao banco local…";
  if (session.status === "error")
    databaseStatus.append(
      el("p", {
        text: `Banco indisponível. As operações estão bloqueadas. ${errorText(session.error)}`,
      }),
      button("Reconectar banco", initialize),
    );
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector("[data-theme-toggle]")
    .setAttribute("aria-pressed", String(theme === "dark"));
}
applyTheme(readTheme());
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-theme-toggle]")) {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
  }
  if (event.target.closest("[data-future-action]")) {
    showToast(
      toasts,
      "Esta ação será conectada ao domínio financeiro na próxima etapa.",
    );
  }
});
createRouter(view).render();

initialize();
