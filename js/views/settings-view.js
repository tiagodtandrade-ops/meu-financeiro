import { el } from "../utils/dom.js";
import { pageHeader } from "../components/page-header.js";
import { operationalPage } from "../controllers/operational-page.js";
export function settingsView() {
  const root = el("div", {}, [
    pageHeader(
      "Configurações",
      "Preferências locais, segurança dos dados e ferramentas de manutenção ficarão concentradas aqui.",
    ),
    el("section", { className: "card" }, [
      el("h2", { className: "section-title", text: "Aparência" }),
      el("div", { className: "settings-row" }, [
        el("div", {}, [
          el("strong", { text: "Tema da interface" }),
          el("p", {
            className: "muted",
            text: "Alterne entre tema claro e escuro pelo botão no topo.",
          }),
        ]),
        el("span", { className: "status-badge", text: "Disponível" }),
      ]),
      el("div", { className: "divider" }),
      el("h2", { className: "section-title", text: "Dados locais" }),
      el("p", {
        className: "muted",
        text: "Backup, restauração, exportação CSV e diagnóstico serão habilitados nas próximas etapas.",
      }),
    ]),
  ]);
  const categories = operationalPage("categories");
  categories.prepend(
    el("h2", { className: "section-title", text: "Categorias" }),
  );
  root.append(categories);
  root.dispose = categories.dispose;
  return root;
}
