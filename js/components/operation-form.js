import { el } from "../utils/dom.js";
import { parseBRLToCents, formatBRL } from "../utils/money.js";
import { isISODate, todayLocalISO } from "../utils/dates.js";
import { finance, notify } from "../services/finance-session.js";

export const types = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};
export const accountTypes = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  other: "Outra",
};
export function button(text, action, primary = false) {
  return el("button", {
    type: "button",
    className: `btn btn-${primary ? "primary" : "secondary"}`,
    text,
    onclick: action,
  });
}
export function errorText(error) {
  return `${error.message || "Não foi possível concluir. Tente novamente."} (${error.code || error.name || "PERSISTENCE"}${error.cause?.name ? ` / ${error.cause.name}` : ""})`;
}
function moneyInput(value = 0) {
  return formatBRL(value).replace(/[^\d,.-]/g, "");
}
let fieldSequence = 0;
export function field(key, label, value = "", options = {}) {
  const id = `field-${key}-${++fieldSequence}`;
  const control = options.choices
    ? el(
        "select",
        { id, name: key },
        options.choices.map(([v, text]) => el("option", { value: v, text })),
      )
    : el(options.multiline ? "textarea" : "input", {
        id,
        name: key,
        type: options.type || "text",
        inputmode: options.money ? "decimal" : undefined,
        maxlength: options.max || 200,
      });
  control.value = value;
  const error = el("span", { id: `${id}-error`, className: "field-error" });
  control.setAttribute("aria-describedby", error.id);
  const node = el("div", { className: "form-field" }, [
    el("label", { for: id, text: label }),
    control,
    error,
  ]);
  return { node, control, error, key, label, ...options };
}
// Native dialog provides focus trapping, inert background, and keyboard semantics.
// Explicit fallback focus covers the case where a successful refresh replaces the opener.
export function formDialog(
  title,
  fields,
  persist,
  success,
  intro = "",
  submitLabel = "Salvar",
) {
  if (document.querySelector("dialog[open]")) return;
  const origin = document.activeElement;
  const heading = el("h2", { id: "operation-title", text: title });
  const summary = el("div", {
    role: "alert",
    className: "form-summary",
    tabindex: "-1",
  });
  const diagnostic = el("details", { hidden: "" }, [
    el("summary", { text: "Detalhes técnicos" }),
    el("pre", { className: "diagnostic-text" }),
  ]);
  const grid = el(
    "div",
    { className: "form-grid" },
    fields.map((f) => f.node),
  );
  const dialog = el("dialog", {
    "aria-labelledby": heading.id,
    className: "operation-dialog",
    tabindex: "-1",
  });
  let busy = false;
  const cancel = button("Cancelar", () => {
    if (!busy) dialog.close();
  });
  const save = el("button", {
    type: "submit",
    className: "btn btn-primary",
    text: submitLabel,
  });
  const form = el("form", { novalidate: "" }, [
    heading,
    el("p", { className: "muted", text: intro }),
    summary,
    diagnostic,
    grid,
    el("div", { className: "form-actions" }, [cancel, save]),
  ]);
  dialog.append(form);
  // Chromium can move activeElement to BODY on Shift+Tab from the first
  // control of a native modal. Wrap only at the two edges; native navigation
  // still handles every intermediate control.
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || busy) return;
    const controls = [
      ...dialog.querySelectorAll(
        "button, input, select, textarea, summary, a[href]",
      ),
    ].filter((node) => !node.disabled && node.getClientRects().length);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    if (busy) event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (origin?.isConnected) origin.focus();
    else {
      const fallback =
        document.querySelector("main [data-create]:not(:disabled)") ||
        document.querySelector("main");
      if (fallback?.tagName === "MAIN") fallback.tabIndex = -1;
      fallback?.focus();
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    summary.textContent = "";
    diagnostic.hidden = true;
    const values = {};
    const problems = [];
    for (const f of fields) {
      f.error.textContent = "";
      f.control.removeAttribute("aria-invalid");
      if (f.node.hidden) continue;
      const value = f.control.value.trim();
      try {
        if (f.required && !value) throw new Error("Preencha este campo.");
        if (f.type === "date" && !isISODate(value))
          throw new Error("Informe uma data válida.");
        values[f.key] = f.money ? parseBRLToCents(value) : value;
      } catch (error) {
        f.error.textContent = error.message;
        f.control.setAttribute("aria-invalid", "true");
        problems.push(`${f.label}: ${error.message}`);
      }
    }
    if (problems.length) {
      summary.textContent = problems.join(" ");
      fields
        .find((f) => f.control.hasAttribute("aria-invalid"))
        ?.control.focus();
      return;
    }
    busy = true;
    for (const f of fields) f.control.disabled = true;
    cancel.disabled = save.disabled = true;
    // Disabling the submit button otherwise leaves BODY active while saving.
    dialog.focus();
    save.textContent = "Salvando…";
    form.setAttribute("aria-busy", "true");
    try {
      await persist(values);
      success?.("Operação concluída com sucesso.");
      dialog.close();
      notify();
    } catch (error) {
      const targets =
        error.code === "DATE_BEFORE_OPENING"
          ? ["date", "initialBalanceDate"]
          : error.code === "CATEGORY_KIND"
            ? ["categoryId"]
            : error.message?.includes("Origem e destino")
              ? ["fromAccountId", "toAccountId"]
              : error.message?.includes("centavos")
                ? ["amountCents", "initialBalanceCents"]
                : [];
      fields
        .filter((f) => targets.includes(f.key) && !f.node.hidden)
        .forEach((f) => {
          f.error.textContent = error.message;
          f.control.setAttribute("aria-invalid", "true");
        });
      diagnostic.hidden = !error.cause;
      diagnostic.querySelector("pre").textContent = error.cause
        ? `${error.cause.name}: ${error.cause.message}`
        : "";
      summary.textContent = `${errorText(error)} Revise os campos e tente salvar novamente.`;
      summary.focus();
    } finally {
      busy = false;
      fields.forEach((f) => {
        f.control.disabled = Boolean(f.locked);
      });
      cancel.disabled = save.disabled = false;
      save.textContent = submitLabel;
      form.removeAttribute("aria-busy");
    }
  });
  document.body.append(dialog);
  dialog.showModal();
  (
    fields.find((f) => !f.control.disabled && !f.node.hidden)?.control || cancel
  ).focus();
  return dialog;
}
export function editEntity(kind, record, success) {
  const isAccount = kind === "accounts";
  const fields = [
    field("name", "Nome", record?.name, { required: true }),
    field(
      isAccount ? "type" : "kind",
      "Tipo",
      record?.[isAccount ? "type" : "kind"] ||
        (isAccount ? "checking" : "expense"),
      {
        choices: Object.entries(
          isAccount ? accountTypes : { income: "Receita", expense: "Despesa" },
        ),
      },
    ),
  ];
  if (isAccount)
    fields.push(
      field(
        "initialBalanceCents",
        "Saldo inicial (R$)",
        moneyInput(record?.initialBalanceCents),
        { money: true, required: true },
      ),
      field(
        "initialBalanceDate",
        "Data do saldo inicial",
        record?.initialBalanceDate || todayLocalISO(),
        { type: "date", required: true },
      ),
    );
  fields.push(
    field("color", "Cor (nome ou código)", record?.color, { max: 40 }),
    field("icon", "Ícone (texto ou emoji)", record?.icon, { max: 80 }),
  );
  return formDialog(
    `${record ? "Editar" : "Nova"} ${isAccount ? "conta" : "categoria"}`,
    fields,
    (values) =>
      record
        ? finance[kind].update(record.id, values)
        : finance[kind].create(values),
    success,
  );
}
export function editOperation(record, accounts, categories, success) {
  const transfer = record?.type === "transfer";
  const type = field("type", "Tipo", record?.type || "expense", {
    choices: Object.entries(types).filter(
      ([key]) =>
        !record || (transfer ? key === "transfer" : key !== "transfer"),
    ),
  });
  const accountChoices = (selected) => [
    ["", "Selecione uma conta"],
    ...accounts
      .filter((a) => !a.archived || a.id === selected)
      .map((a) => [a.id, `${a.name}${a.archived ? " (arquivada)" : ""}`]),
  ];
  const account = field("accountId", "Conta", record?.accountId, {
    choices: accountChoices(record?.accountId),
    required: true,
  });
  const from = field(
    "fromAccountId",
    "Conta de origem",
    record?.fromAccountId,
    { choices: accountChoices(record?.fromAccountId), required: true },
  );
  const to = field("toAccountId", "Conta de destino", record?.toAccountId, {
    choices: accountChoices(record?.toAccountId),
    required: true,
  });
  const category = field("categoryId", "Categoria", "", {
    choices: [],
    required: true,
  });
  const refresh = () => {
    const isTransfer = type.control.value === "transfer";
    account.node.hidden = category.node.hidden = isTransfer;
    from.node.hidden = to.node.hidden = !isTransfer;
    const selected = category.control.value || record?.categoryId;
    category.control.replaceChildren(
      el("option", { value: "", text: "Selecione uma categoria" }),
      ...categories
        .filter(
          (c) =>
            c.kind === type.control.value &&
            (!c.archived || c.id === record?.categoryId),
        )
        .map((c) =>
          el("option", {
            value: c.id,
            text: `${c.name}${c.archived ? " (arquivada)" : ""}`,
          }),
        ),
    );
    category.control.value = selected || "";
  };
  type.control.addEventListener("change", refresh);
  refresh();
  const fields = [
    type,
    field("date", "Data", record?.date || todayLocalISO(), {
      type: "date",
      required: true,
    }),
    field("description", "Descrição", record?.description, { required: true }),
    field(
      "amountCents",
      "Valor (R$)",
      record ? moneyInput(record.amountCents) : "",
      { money: true, required: true },
    ),
    account,
    category,
    from,
    to,
    field("notes", "Observações", record?.notes, {
      multiline: true,
      max: 2000,
    }),
  ];
  return formDialog(
    record ? "Editar lançamento" : "Novo lançamento",
    fields,
    (values) => {
      if (values.type === "transfer") {
        delete values.type;
        return record
          ? finance.transactions.updateTransfer(record.transferId, values)
          : finance.transactions.createTransfer(values);
      }
      return record
        ? finance.transactions.update(record.id, values)
        : finance.transactions.create(values);
    },
    success,
    "Use valores como 1.234,56. Contas e categorias arquivadas precisam ser reativadas para editar suas movimentações.",
  );
}
export function confirmRemoval(label, persist, success) {
  const dialog = formDialog(
    "Confirmar exclusão",
    [],
    persist,
    success,
    `Excluir ${label}? Esta ação não pode ser desfeita. Registros com vínculos serão protegidos pelo banco.`,
    "Excluir definitivamente",
  );
  if (dialog)
    dialog.querySelector('[type="submit"]').textContent =
      "Excluir definitivamente";
}
