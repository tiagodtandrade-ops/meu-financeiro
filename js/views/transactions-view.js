import { el } from "../utils/dom.js";
import { pageHeader } from "../components/page-header.js";
import { operationalPage } from "../controllers/operational-page.js";
export function transactionsView() {
  const operations = operationalPage("transactions");
  const root = el("div", {}, [
    pageHeader(
      "Lançamentos",
      "Registre e encontre receitas, despesas e transferências.",
    ),
    operations,
  ]);
  root.dispose = operations.dispose;
  return root;
}
