import { dashboardView } from "./views/dashboard-view.js";
import { transactionsView } from "./views/transactions-view.js";
import { accountsView } from "./views/accounts-view.js";
import { budgetsView } from "./views/budgets-view.js";
import { settingsView } from "./views/settings-view.js";
import { clear } from "./utils/dom.js";
import { updateActiveNav } from "./components/app-shell.js";
import { basePath, sitePath } from "./utils/base-path.js";
const routes = new Map([
  ["/", dashboardView],
  ["/lancamentos", transactionsView],
  ["/contas", accountsView],
  ["/orcamentos", budgetsView],
  ["/configuracoes", settingsView],
]);
export function normalizePath(pathname) {
  const withinBase = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length - 1)
    : pathname;
  const clean = withinBase.replace(/\/+$/, "") || "/";
  return routes.has(clean) ? clean : "/";
}
export function createRouter(view) {
  function render() {
    const path = normalizePath(location.pathname);
    if (sitePath(path) !== location.pathname)
      history.replaceState({}, "", sitePath(path));
    view.firstElementChild?.dispose?.();
    clear(view);
    view.append(routes.get(path)());
    updateActiveNav(path);
    view.focus({ preventScroll: true });
  }
  function navigate(path) {
    history.pushState({}, "", sitePath(path));
    render();
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-route]");
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(link.getAttribute("data-route"));
  });
  window.addEventListener("popstate", render);
  return { render, navigate };
}
