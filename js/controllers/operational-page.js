import { el } from "../utils/dom.js";
import {
  finance,
  session,
  subscribe,
  initialize,
} from "../services/finance-session.js";
import { listOperations } from "../services/operations-service.js";
import {
  button,
  field,
  editEntity,
  editOperation,
  confirmRemoval,
  errorText,
  types,
  accountTypes,
} from "../components/operation-form.js";
import { formatBRL } from "../utils/money.js";

export function operationalPage(kind) {
  const entities = kind !== "transactions";
  const feedback = el("p", {
    role: "status",
    "aria-live": "polite",
    className: "operation-feedback",
  });
  const status = el("div", { role: "status", "aria-live": "polite" });
  const list = el("div", { className: "record-list" });
  const toolbar = el("div", { className: "operation-toolbar" });
  const root = el("section", { className: "card operational" }, [
    toolbar,
    feedback,
    status,
    list,
  ]);
  let version = 0,
    disposed = false,
    accounts = [],
    categories = [],
    page = 1;
  let rows = [],
    balances = new Map(),
    history = new Set();
  let returnToCreate = false;
  const success = (message) => {
    returnToCreate = true;
    feedback.textContent = message;
  };
  const create = button(
    kind === "accounts"
      ? "+ Nova conta"
      : kind === "categories"
        ? "+ Nova categoria"
        : "+ Novo lançamento",
    () =>
      entities
        ? editEntity(kind, null, success)
        : editOperation(null, accounts, categories, success),
    true,
  );
  create.setAttribute("data-create", "");
  create.disabled = true;
  toolbar.append(create);
  const filterFields = [];
  let archived;
  if (entities) {
    archived = el("input", { type: "checkbox", id: `show-${kind}` });
    archived.addEventListener("change", () => {
      page = 1;
      draw();
    });
    toolbar.append(
      el("label", { className: "checkbox-label", for: archived.id }, [
        archived,
        el("span", { text: "Mostrar arquivadas" }),
      ]),
    );
  } else {
    filterFields.push(
      field("text", "Buscar descrição ou observações", ""),
      field("from", "Data inicial", "", { type: "date" }),
      field("to", "Data final", "", { type: "date" }),
      field("type-filter", "Filtrar tipo", "", {
        choices: [["", "Todos"], ...Object.entries(types)],
      }),
      field("accountId", "Filtrar conta", "", { choices: [["", "Todas"]] }),
      field("categoryId", "Filtrar categoria", "", {
        choices: [["", "Todas"]],
      }),
    );
    const filters = el(
      "form",
      { className: "filter-grid", "aria-label": "Filtros de lançamentos" },
      filterFields.map((f) => f.node),
    );
    filters.append(
      el("button", {
        type: "submit",
        className: "btn btn-secondary",
        text: "Aplicar filtros",
      }),
      button("Limpar filtros", () => {
        filterFields.forEach((f) => {
          f.control.value = "";
        });
        page = 1;
        load();
      }),
    );
    filters.addEventListener("submit", (event) => {
      event.preventDefault();
      page = 1;
      load();
    });
    root.insertBefore(filters, feedback);
  }
  function filters() {
    return Object.fromEntries(
      filterFields
        .filter((f) => f.control.value)
        .map((f) => [
          f.key === "type-filter" ? "type" : f.key,
          f.control.value,
        ]),
    );
  }
  function populate(key, items) {
    const f = filterFields.find((f) => f.key === key);
    if (!f) return;
    const old = f.control.value;
    f.control.replaceChildren(
      el("option", { value: "", text: "Todas" }),
      ...items.map((item) =>
        el("option", {
          value: item.id,
          text: `${item.name}${item.archived ? " (arquivada)" : ""}`,
        }),
      ),
    );
    f.control.value = old;
  }
  async function load() {
    const current = ++version;
    const restoreFocus = list.contains(document.activeElement);
    create.disabled = true;
    if (session.status !== "ready") {
      list.replaceChildren();
      status.replaceChildren(
        el("p", {
          text:
            session.status === "loading"
              ? "Carregando banco local…"
              : `Banco local indisponível. Escritas bloqueadas. ${errorText(session.error)}`,
        }),
      );
      if (session.status === "error")
        status.append(button("Tentar novamente", initialize));
      return;
    }
    status.textContent = "Carregando registros…";
    list.setAttribute("inert", "");
    try {
      const [a, c, records, balanceData, postings] = await Promise.all([
        finance.accounts.list(),
        finance.categories.list(),
        entities ? finance[kind].list() : listOperations(finance, filters()),
        kind === "accounts" ? finance.analytics.balances() : null,
        kind === "accounts" ? finance.transactions.list() : null,
      ]);
      if (disposed || current !== version) return;
      accounts = a;
      categories = c;
      rows = records;
      if (balanceData)
        balances = new Map(
          balanceData.byAccount.map((b) => [b.accountId, b.balanceCents]),
        );
      if (postings) history = new Set(postings.map((p) => p.accountId));
      populate("accountId", accounts);
      populate("categoryId", categories);
      status.replaceChildren();
      create.disabled = false;
      draw();
      if (
        (restoreFocus || returnToCreate) &&
        !document.querySelector("dialog[open]")
      ) {
        create.focus();
        returnToCreate = false;
      }
    } catch (error) {
      if (disposed || current !== version) return;
      list.replaceChildren();
      status.replaceChildren(
        el("p", { role: "alert", text: errorText(error) }),
        button("Tentar novamente", load),
      );
    } finally {
      if (current === version) list.removeAttribute("inert");
    }
  }
  function draw() {
    if (kind === "categories")
      rows.sort((a, b) => a.kind.localeCompare(b.kind));
    const visible = entities
      ? rows.filter((r) => archived.checked || !r.archived)
      : rows;
    const totalPages = Math.max(1, Math.ceil(visible.length / 25));
    page = Math.min(page, totalPages);
    list.replaceChildren();
    if (!visible.length) {
      list.append(
        el("p", {
          className: "empty-state",
          text: entities
            ? "Nenhum registro nesta visualização. Adicione um novo ou visualize arquivados."
            : Object.keys(filters()).length
              ? "Nenhum resultado para os filtros atuais."
              : "Nenhum lançamento ainda. Comece criando uma conta e seu primeiro lançamento.",
        }),
      );
      return;
    }
    const nameOf = (items, id) => {
      const item = items.find((i) => i.id === id);
      return item
        ? `${item.name}${item.archived ? " (arquivada)" : ""}`
        : "Registro indisponível";
    };
    let lastKind;
    for (const record of visible.slice((page - 1) * 25, page * 25)) {
      if (kind === "categories" && lastKind !== record.kind) {
        list.append(el("h3", { text: types[record.kind] }));
        lastKind = record.kind;
      }
      const title = record.name || record.description;
      const info = el("div", { className: "record-copy" }, [
        el("h3", { text: title }),
      ]);
      if (entities) {
        info.append(
          el("p", {
            text: `${kind === "accounts" ? accountTypes[record.type] : types[record.kind]} • ${record.archived ? "Arquivada" : "Ativa"}`,
          }),
        );
        if (record.icon || record.color)
          info.append(
            el("p", {
              className: "muted",
              text: `${record.icon || ""} ${record.color ? `Cor: ${record.color}` : ""}`,
            }),
          );
        if (kind === "accounts")
          info.append(
            el("strong", { text: formatBRL(balances.get(record.id)) }),
            el("p", {
              className: "muted",
              text: history.has(record.id)
                ? "Com histórico • exclusão protegida"
                : "Sem movimentações",
            }),
          );
      } else {
        const date = record.date.split("-").reverse().join("/");
        info.append(
          el("p", { text: `${types[record.type]} • ${date}` }),
          el("p", {
            className: "muted",
            text:
              record.type === "transfer"
                ? `${nameOf(accounts, record.fromAccountId)} → ${nameOf(accounts, record.toAccountId)}`
                : `${nameOf(accounts, record.accountId)} • ${nameOf(categories, record.categoryId)}`,
          }),
          el("strong", { text: formatBRL(record.amountCents) }),
        );
        if (record.notes)
          info.append(el("p", { className: "muted", text: record.notes }));
      }
      const actions = el("div", { className: "record-actions" });
      const edit = button("Editar", () =>
        entities
          ? editEntity(kind, record, success)
          : editOperation(record, accounts, categories, success),
      );
      const remove = button("Excluir", () =>
        confirmRemoval(
          title,
          () =>
            record.type === "transfer"
              ? finance.transactions.removeTransfer(record.transferId)
              : finance[kind].remove(record.id),
          success,
        ),
      );
      actions.append(edit);
      if (entities)
        actions.append(
          button(record.archived ? "Reativar" : "Arquivar", async () => {
            if (actions.hasAttribute("inert")) return;
            actions.setAttribute("inert", "");
            try {
              await finance[kind].archive(record.id, !record.archived);
              success(
                record.archived ? "Registro reativado." : "Registro arquivado.",
              );
              await load();
              create.focus();
            } catch (error) {
              feedback.textContent = errorText(error);
            } finally {
              actions.removeAttribute("inert");
            }
          }),
        );
      actions.append(remove);
      list.append(
        el("article", { className: "record", "aria-label": title }, [
          info,
          actions,
        ]),
      );
    }
    const previous = button("Anterior", () => {
      page--;
      draw();
      previousFocus();
    });
    previous.disabled = page === 1;
    const next = button("Próxima", () => {
      page++;
      draw();
      previousFocus();
    });
    next.disabled = page === totalPages;
    list.append(
      el("div", { className: "pagination", "aria-label": "Paginação" }, [
        previous,
        el("span", {
          text: `Página ${page} de ${totalPages} • ${visible.length} registros`,
        }),
        next,
      ]),
    );
  }
  function previousFocus() {
    list.setAttribute("tabindex", "-1");
    list.focus();
  }
  const unsubscribe = subscribe(load);
  root.dispose = () => {
    disposed = true;
    version++;
    unsubscribe();
  };
  load();
  return root;
}
