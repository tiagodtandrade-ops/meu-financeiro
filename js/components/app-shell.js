import { el } from "../utils/dom.js";
const items = [
  ["/", "⌂", "Dashboard"],
  ["/lancamentos", "↕", "Lançamentos"],
  ["/contas", "▣", "Contas"],
  ["/orcamentos", "◔", "Orçamentos"],
  ["/configuracoes", "⚙", "Configurações"],
];
function navLink([path, icon, label]) {
  return el("a", { className: "nav-link", href: path, "data-route": path }, [
    el("span", { className: "nav-icon", "aria-hidden": "true", text: icon }),
    el("span", { text: label }),
  ]);
}
export function appShell() {
  const desktopNav = el(
    "nav",
    { className: "nav", "aria-label": "Navegação principal" },
    items.map(navLink),
  );
  const sidebar = el("aside", { className: "sidebar" }, [
    el("div", { className: "brand" }, [
      el("span", { className: "brand-mark", text: "M" }),
      el("span", { text: "Meu Financeiro" }),
    ]),
    desktopNav,
    el("p", {
      className: "sidebar-footer",
      text: "Privado por padrão • dados locais",
    }),
  ]);
  const themeButton = el("button", {
    className: "icon-btn",
    type: "button",
    "aria-label": "Alternar tema",
    "data-theme-toggle": "",
    text: "◐",
  });
  const main = el("div", { className: "main-shell" }, [
    el("header", { className: "topbar" }, [
      el("div", {
        className: "topbar-title",
        text: "Visão financeira pessoal",
      }),
      el("div", { className: "topbar-actions" }, [themeButton]),
    ]),
    el("main", { className: "content", id: "route-view", tabindex: "-1" }),
  ]);
  const mobileNav = el(
    "nav",
    { className: "mobile-nav", "aria-label": "Navegação móvel" },
    items.map(navLink),
  );
  return {
    root: el("div", { className: "app-shell" }, [sidebar, main, mobileNav]),
    view: main.querySelector("#route-view"),
  };
}
export function updateActiveNav(path) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.getAttribute("data-route") === path;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}
