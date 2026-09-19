import { el } from "../utils/dom.js";
import { pageHeader } from "../components/page-header.js";
import { operationalPage } from "../controllers/operational-page.js";
export function accountsView() {
  const operations = operationalPage("accounts");
  const root = el("div", {}, [
    pageHeader("Contas", "Contas, saldos atuais e histórico preservado."),
    operations,
  ]);
  root.dispose = operations.dispose;
  return root;
}
