import { el } from "../utils/dom.js";
import { pageHeader } from "../components/page-header.js";
import { emptyState } from "../components/empty-state.js";
export function budgetsView() {
  const action = el("button", {
    className: "btn btn-primary",
    type: "button",
    text: "+ Criar orçamento",
    "data-future-action": "budget",
  });
  return el("div", {}, [
    pageHeader(
      "Orçamentos",
      "Defina limites mensais por categoria e acompanhe o consumo ao longo do mês.",
      action,
    ),
    el("section", { className: "card" }, [
      emptyState({
        icon: "◔",
        title: "Sem orçamentos definidos",
        description:
          "Os orçamentos serão comparados às despesas reais, sem alterar ou duplicar os dados das movimentações.",
      }),
    ]),
  ]);
}
