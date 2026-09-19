import { el } from "../utils/dom.js";
import { pageHeader } from "../components/page-header.js";
import { emptyState } from "../components/empty-state.js";
import { finance, session, subscribe } from "../services/finance-session.js";
import { editOperation, errorText } from "../components/operation-form.js";
export function dashboardView() {
  const action = el("button", {
    className: "btn btn-primary",
    type: "button",
    text: "+ Novo lançamento",
    "data-create": "",
  });
  const feedback = el("p", { role: "status" });
  const update = () => {
    action.disabled = session.status !== "ready";
  };
  update();
  const dispose = subscribe(update);
  action.addEventListener("click", async () => {
    action.disabled = true;
    try {
      const [accounts, categories] = await Promise.all([
        finance.accounts.list(),
        finance.categories.list(),
      ]);
      if (action.isConnected)
        editOperation(null, accounts, categories, (message) => {
          feedback.textContent = message;
        });
    } catch (error) {
      feedback.textContent = errorText(error);
    } finally {
      update();
    }
  });
  const metrics = [
    ["Saldo total", "R$ —"],
    ["Receitas no mês", "R$ —"],
    ["Despesas no mês", "R$ —"],
  ].map(([label, value]) =>
    el("article", { className: "card metric-card" }, [
      el("span", { className: "metric-label", text: label }),
      el("strong", {
        className: "metric-value placeholder-value",
        text: value,
      }),
    ]),
  );
  const root = el("div", {}, [
    pageHeader(
      "Dashboard",
      "Seu panorama financeiro será calculado a partir dos lançamentos registrados.",
      action,
    ),
    feedback,
    el(
      "section",
      { className: "grid grid-3", "aria-label": "Resumo financeiro" },
      metrics,
    ),
    el("section", { className: "card", style: "margin-top:var(--space-5)" }, [
      emptyState({
        icon: "↗",
        title: "Seu histórico começa aqui",
        description:
          "Quando você registrar movimentações, esta área mostrará evolução, distribuição de gastos e tendências sem duplicar saldos no banco.",
      }),
    ]),
  ]);
  root.dispose = dispose;
  return root;
}
