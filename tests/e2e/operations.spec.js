import { test, expect } from "@playwright/test";

// Every Playwright test gets a fresh browser context and its own native IndexedDB.
// No application data or storage is shared with another test or a user's browser.
test.beforeEach(async ({ page }) => {
  await page.goto("/contas");
  await expect(
    page.getByRole("button", { name: "+ Nova conta", exact: true }),
  ).toBeEnabled();
});
async function seed(page) {
  return page.evaluate(async () => {
    const { finance } = await import("/js/services/finance-session.js");
    const input = {
      type: "checking",
      initialBalanceCents: 0,
      initialBalanceDate: "2026-01-01",
    };
    const a = await finance.accounts.create({ ...input, name: "Principal" });
    const b = await finance.accounts.create({ ...input, name: "Reserva" });
    const income = await finance.categories.create({
      name: "Entrada teste",
      kind: "income",
    });
    const expense = await finance.categories.create({
      name: "Saída teste",
      kind: "expense",
    });
    return { a, b, income, expense };
  });
}
async function records(page) {
  return page.evaluate(async () =>
    (
      await import("/js/services/finance-session.js")
    ).finance.transactions.list(),
  );
}
async function openTransaction(
  page,
  type = "expense",
  description = "Café de teste",
) {
  await page.goto("/lancamentos");
  await page
    .getByRole("button", { name: "+ Novo lançamento", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption(type);
  await dialog.getByLabel("Descrição", { exact: true }).fill(description);
  await dialog.getByLabel("Data", { exact: true }).fill("2026-06-01");
  await dialog.getByLabel("Valor (R$)", { exact: true }).fill("1.234,56");
  if (type === "transfer") {
    await dialog
      .getByLabel("Conta de origem")
      .selectOption({ label: "Principal" });
    await dialog
      .getByLabel("Conta de destino")
      .selectOption({ label: "Reserva" });
  } else {
    await dialog
      .getByLabel("Conta", { exact: true })
      .selectOption({ label: "Principal" });
    await dialog.getByLabel("Categoria", { exact: true }).selectOption({
      label: type === "income" ? "Entrada teste" : "Saída teste",
    });
  }
  return dialog;
}
async function save(dialog) {
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test("conta: criar, editar, arquivar, reativar, confirmar e excluir", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Nova conta", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Minha conta");
  await dialog.getByLabel("Saldo inicial (R$)").fill("-0,01");
  await save(dialog);
  let row = page.getByRole("article", { name: "Minha conta", exact: true });
  await expect(row).toContainText("Sem movimentações");
  await expect(row).toContainText("0,01");
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Conta editada");
  await save(dialog);
  row = page.getByRole("article", { name: "Conta editada", exact: true });
  await row.getByRole("button", { name: "Arquivar", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Mostrar arquivadas").check();
  await expect(row).toContainText("Arquivada");
  await row.getByRole("button", { name: "Reativar", exact: true }).click();
  await expect(row).toContainText("Ativa");
  await row.getByRole("button", { name: "Excluir", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Excluir", exact: true }).click();
  await page
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(row).toHaveCount(0);
});

test("categoria: CRUD, arquivo e personalização sobrevivem a reload", async ({
  page,
}) => {
  await page.goto("/configuracoes");
  await page
    .getByRole("button", { name: "+ Nova categoria", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Categoria própria");
  await save(dialog);
  const row = page.getByRole("article", {
    name: "Categoria própria",
    exact: true,
  });
  await row.getByRole("button", { name: "Arquivar", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Mostrar arquivadas").check();
  await row.getByRole("button", { name: "Reativar", exact: true }).click();
  await expect(row).toContainText("Ativa");
  await row.getByRole("button", { name: "Editar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption("income");
  await save(dialog);
  await page.reload();
  await expect(row).toContainText("Receita");
  await row.getByRole("button", { name: "Excluir", exact: true }).click();
  await page
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill("Inicial personalizada");
  await save(page.getByRole("dialog"));
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Inicial personalizada", exact: true }),
  ).toHaveCount(1);
});

for (const type of ["income", "expense", "transfer"]) {
  test(`${type}: criar/editar/excluir, centavos, IDs e persistência`, async ({
    page,
  }) => {
    await seed(page);
    const dialog = await openTransaction(page, type);
    await save(dialog);
    await expect(page.locator("article.record")).toHaveCount(1);
    const before = await records(page);
    expect(before).toHaveLength(type === "transfer" ? 2 : 1);
    expect(before.every((r) => r.amountCents === 123456)).toBe(true);
    await page.reload();
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Valor (R$)").fill("0,01");
    await save(page.getByRole("dialog"));
    const after = await records(page);
    expect(after.map((r) => r.id).sort()).toEqual(
      before.map((r) => r.id).sort(),
    );
    expect(after.map((r) => r.createdAt).sort()).toEqual(
      before.map((r) => r.createdAt).sort(),
    );
    expect(after.every((r) => r.amountCents === 1)).toBe(true);
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await page
      .getByRole("button", { name: "Excluir definitivamente", exact: true })
      .click();
    await expect(page.locator("article.record")).toHaveCount(0);
    expect(await records(page)).toHaveLength(0);
  });
}

test("validações: campos, data, moeda, positivo e contas distintas", async ({
  page,
}) => {
  await seed(page);
  const dialog = await openTransaction(page, "transfer");
  await dialog.getByLabel("Descrição", { exact: true }).fill("");
  await dialog.getByLabel("Data", { exact: true }).fill("");
  await dialog.getByLabel("Valor (R$)").fill("1.23");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.locator('[aria-invalid="true"]')).toHaveCount(3);
  await dialog.getByLabel("Descrição", { exact: true }).fill("Transferir");
  await dialog.getByLabel("Data", { exact: true }).fill("2026-06-01");
  await dialog.getByLabel("Valor (R$)").fill("0");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("maiores que zero");
  await dialog.getByLabel("Valor (R$)").fill("1,00");
  await dialog
    .getByLabel("Conta de destino")
    .selectOption({ label: "Principal" });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("contas diferentes");
  await expect(dialog.getByLabel("Conta de destino")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await records(page)).toHaveLength(0);
});

test("filtros AND, busca sem acentos, destino de transferência, limpar e vazio", async ({
  page,
}) => {
  const data = await seed(page);
  await save(await openTransaction(page, "income", "CAFÉ Açúcar"));
  await save(await openTransaction(page, "transfer", "Transferência café"));
  await page.getByLabel("Buscar descrição ou observações").fill("cafe");
  await page.getByLabel("Data inicial", { exact: true }).fill("2026-06-01");
  await page.getByLabel("Data final", { exact: true }).fill("2026-06-01");
  await page.getByLabel("Filtrar tipo").selectOption("income");
  await page.getByLabel("Filtrar conta").selectOption(data.a.id);
  await page.getByLabel("Filtrar categoria").selectOption(data.income.id);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator("article.record")).toHaveCount(1);
  await expect(page.locator("article.record")).toContainText("CAFÉ Açúcar");
  await page.getByLabel("Buscar descrição ou observações").fill("inexistente");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(
    page.getByText("Nenhum resultado para os filtros atuais."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator("article.record")).toHaveCount(2);
  await page.getByLabel("Filtrar conta").selectOption(data.b.id);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.locator("article.record")).toHaveCount(1);
  await expect(page.locator("article.record")).toContainText(
    "Principal → Reserva",
  );
});

test("arquivados somem de novas opções, histórico legível e exclusão protegida", async ({
  page,
}) => {
  const data = await seed(page);
  await save(await openTransaction(page));
  await page.evaluate(async ({ a, expense }) => {
    const { finance } = await import("/js/services/finance-session.js");
    await finance.accounts.archive(a.id);
    await finance.categories.archive(expense.id);
  }, data);
  await page.reload();
  await expect(page.locator("article.record")).toContainText(
    "Principal (arquivada)",
  );
  await page
    .getByRole("button", { name: "+ Novo lançamento", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("Conta", { exact: true })
      .locator("option"),
  ).not.toContainText(["Principal"]);
  await expect(
    page
      .getByRole("dialog")
      .getByLabel("Categoria", { exact: true })
      .locator("option"),
  ).not.toContainText(["Saída teste"]);
  await page.keyboard.press("Escape");
  await page.goto("/contas");
  await page.getByLabel("Mostrar arquivadas").check();
  await page
    .getByRole("article", { name: "Principal", exact: true })
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "REFERENCED",
  );
});

test("dupla submissão e falha atômica mantêm formulário e banco coerentes", async ({
  page,
}) => {
  await seed(page);
  const dialog = await openTransaction(page, "transfer");
  await page.evaluate(async () => {
    const { db } = await import("/js/db/database.js");
    window.failHook = function (_key, row) {
      if (row.direction === "in") throw new Error("Falha de escrita simulada");
    };
    db.transactions.hook("creating", window.failHook);
  });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("PERSISTENCE");
  expect(await records(page)).toHaveLength(0);
  await expect(dialog.getByLabel("Valor (R$)")).toHaveValue("1.234,56");
  await page.evaluate(async () => {
    const { db } = await import("/js/db/database.js");
    db.transactions.hook("creating").unsubscribe(window.failHook);
  });
  await dialog.locator("form").evaluate((form) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(dialog).toHaveCount(0);
  expect(await records(page)).toHaveLength(2);
  await expect(page.locator("article.record")).toHaveCount(1);
});

test("conteúdo HTML, aspas, emoji e observações são texto inerte", async ({
  page,
}) => {
  await seed(page);
  const malicious = '<img src=x onerror="window.bad=1"> Áé " 🐶';
  const dialog = await openTransaction(page, "expense", malicious);
  await dialog.getByLabel("Observações").fill(malicious);
  await save(dialog);
  await expect(page.locator("article.record")).toContainText(malicious);
  await expect(page.locator("article.record img")).toHaveCount(0);
  expect(await page.evaluate(() => window.bad)).toBeUndefined();
});

test("teclado: foco inicial, contenção, Escape e restauração", async ({
  page,
}) => {
  const opener = page.getByRole("button", {
    name: "+ Nova conta",
    exact: true,
  });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Nome", { exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Nome", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("IndexedDB indisponível: shell, bloqueio e nova tentativa", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      if (!window.allowDatabase)
        throw new DOMException("Acesso bloqueado", "SecurityError");
      return original.apply(this, args);
    };
  });
  await page.reload();
  await expect(page.getByText(/Banco local indisponível/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Nova conta", exact: true }),
  ).toBeDisabled();
  await page.locator('[data-route="/configuracoes"]:visible').click();
  await expect(
    page.getByRole("heading", { name: "Configurações", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.allowDatabase = true;
  });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("button", { name: "+ Nova categoria", exact: true }),
  ).toBeEnabled();
});

for (const [width, height] of [
  [360, 640],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1440, 900],
]) {
  test(`operação responsiva ${width}x${height}, temas e texto 200%`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await seed(page);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      await page
        .getByRole("button", { name: "+ Nova conta", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Nome", { exact: true }).fill("Conta responsiva");
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await dialog.evaluate(
          (d) =>
            d.scrollWidth <= d.clientWidth &&
            d.getBoundingClientRect().height <= innerHeight,
        ),
      ).toBe(true);
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
      });
    }
  });
}

test("paginação limita renderização e conserva filtros", async ({ page }) => {
  const data = await seed(page);
  await page.evaluate(async ({ a, income }) => {
    const { finance } = await import("/js/services/finance-session.js");
    for (let i = 0; i < 28; i++)
      await finance.transactions.create({
        type: "income",
        description: `Registro ${i}`,
        date: "2026-06-01",
        amountCents: 1,
        accountId: a.id,
        categoryId: income.id,
      });
  }, data);
  await page.goto("/lancamentos");
  await expect(page.locator("article.record")).toHaveCount(25);
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator("article.record")).toHaveCount(3);
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.locator("article.record")).toHaveCount(25);
});

test("data anterior à abertura associa erro sem perder preenchimento", async ({
  page,
}) => {
  await seed(page);
  const dialog = await openTransaction(page);
  await dialog.getByLabel("Data", { exact: true }).fill("2025-12-31");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("DATE_BEFORE_OPENING");
  await expect(dialog.getByLabel("Data", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(await records(page)).toHaveLength(0);
});

test("categoria referenciada por orçamento tem exclusão protegida", async ({
  page,
}) => {
  const data = await seed(page);
  await page.evaluate(async ({ expense }) => {
    const { finance } = await import("/js/services/finance-session.js");
    await finance.budgets.save({
      month: "2026-06",
      categoryId: expense.id,
      limitCents: 100,
    });
  }, data);
  await page.goto("/configuracoes");
  await page
    .getByRole("article", { name: "Saída teste", exact: true })
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Excluir definitivamente", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "histórico ou orçamento",
  );
});

test("editar histórico arquivado mantém dados e permite retry após reativação", async ({
  page,
}) => {
  const data = await seed(page);
  await save(await openTransaction(page));
  await page.evaluate(async ({ a }) => {
    const { finance } = await import("/js/services/finance-session.js");
    await finance.accounts.archive(a.id);
  }, data);
  await page.reload();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Histórico editado");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("ARCHIVED");
  expect((await records(page))[0].description).toBe("Café de teste");
  await page.evaluate(async ({ a }) => {
    const { finance } = await import("/js/services/finance-session.js");
    await finance.accounts.archive(a.id, false);
  }, data);
  await save(dialog);
  await expect(page.locator("article.record")).toContainText(
    "Histórico editado",
  );
});

test("CTA do dashboard abre formulário integrado e navegação rápida não restaura view antiga", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "+ Novo lançamento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-route="/lancamentos"]:visible').click();
  await page.locator('[data-route="/contas"]:visible').click();
  await expect(page.locator("main h1")).toHaveText("Contas");
  await expect(page.locator("article.record")).toHaveCount(2);
});
