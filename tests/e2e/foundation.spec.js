import { test as base, expect } from "@playwright/test";

// Instrument each page before navigation; application traffic must stay local.
const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type()))
        errors.push(`${message.type()}: ${message.text()}`);
    });
    page.on("request", (request) => requests.push(request.url()));
    page.on("requestfailed", (request) =>
      errors.push(`requestfailed: ${request.url()}`),
    );
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    await use(page);
    await testInfo.attach("console-network.json", {
      body: JSON.stringify(
        { browser: page.context().browser().version(), errors, requests },
        null,
        2,
      ),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
    expect(
      requests.filter((url) => !url.startsWith("http://127.0.0.1:4173/")),
    ).toEqual([]);
  },
});
const routes = [
  "/",
  "/lancamentos",
  "/contas",
  "/orcamentos",
  "/configuracoes",
];

async function checkRoute(page, path) {
  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator("#route-view")).toBeFocused();
  await expect(
    page.locator('[data-route][aria-current="page"]:visible'),
  ).toHaveAttribute("href", path);
  expect(new URL(page.url()).pathname).toBe(path);
}

for (const width of [360, 390, 768, 1024, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`${width}x900 ${theme}: páginas, refresh, layout, toast e preferência`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("mf-theme", value),
        theme,
      );
      for (const path of routes) {
        await page.goto(path);
        await checkRoute(page, path);
        await page.reload();
        await checkRoute(page, path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const dimensions = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          controls: [...document.querySelectorAll("button, a[data-route]")]
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => ({
              text: el.textContent,
              width: el.getBoundingClientRect().width,
              height: el.getBoundingClientRect().height,
            })),
        }));
        expect(dimensions.scroll).toBeLessThanOrEqual(width);
        expect(
          dimensions.controls.every(
            (rect) => rect.width >= 44 && rect.height >= 44,
          ),
        ).toBe(true);
        await testInfo.attach(
          `layout-${path.replaceAll("/", "") || "dashboard"}.json`,
          { body: JSON.stringify(dimensions), contentType: "application/json" },
        );
        await expect(page.locator(".mobile-nav")).toBeVisible({
          visible: width <= 900,
        });
        if (await page.locator("[data-future-action]").count()) {
          await page.locator("[data-future-action]").first().click();
          const toast = page.locator(".toast").last();
          await expect(toast).toBeVisible();
          const box = await toast.boundingBox();
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(width);
          if (width <= 900) {
            const nav = await page.locator(".mobile-nav").boundingBox();
            expect(box.y + box.height).toBeLessThanOrEqual(nav.y);
          }
        }
        await page.screenshot({
          path: testInfo.outputPath(
            `${path.replaceAll("/", "") || "dashboard"}.png`,
          ),
          fullPage: true,
        });
      }
    });
  }
}

test("histórico, rota desconhecida, foco e teclado", async ({ page }) => {
  await page.goto("/");
  for (const path of routes.slice(1)) {
    await page.locator(`[data-route="${path}"]:visible`).click();
    await checkRoute(page, path);
  }
  await page.goBack();
  await checkRoute(page, "/orcamentos");
  await page.goForward();
  await checkRoute(page, "/configuracoes");
  await page.goto("/desconhecida");
  await checkRoute(page, "/");
  const toggle = page.locator("[data-theme-toggle]");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.locator('[data-route="/configuracoes"]:visible'),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await checkRoute(page, "/configuracoes");
  await toggle.focus();
  await page.keyboard.press("Tab");
  await expect(toggle).not.toBeFocused();
  // Escape is not applicable: this foundation has no dialog or dismissible menu.
});

for (const mode of [
  "normal",
  "read-error",
  "write-error",
  "access-error",
  "unknown",
]) {
  test(`preferência ${mode}: tema e navegação continuam funcionais`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      if (mode === "access-error")
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("blocked", "SecurityError");
          },
        });
      if (mode === "read-error")
        Storage.prototype.getItem = () => {
          throw new DOMException("blocked", "SecurityError");
        };
      if (mode === "write-error")
        Storage.prototype.setItem = () => {
          throw new DOMException("full", "QuotaExceededError");
        };
      if (mode === "unknown") localStorage.setItem("mf-theme", "unknown");
    }, mode);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("[data-theme-toggle]").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator('[data-route="/contas"]:visible').click();
    await checkRoute(page, "/contas");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await checkRoute(page, "/contas");
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      mode === "normal" ? "dark" : "light",
    );
  });
}

test("Dexie local: abrir/fechar banco isolado e propagar erro", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { createDatabase, openDatabase } = await import("/js/db/database.js");
    const name = `mf-smoke-${crypto.randomUUID()}`;
    const isolated = createDatabase(name);
    try {
      await openDatabase(isolated);
      const open = isolated.isOpen();
      isolated.close();
      let propagated = false;
      try {
        await openDatabase({
          open: async () => {
            throw new Error("test failure");
          },
        });
      } catch (error) {
        propagated = error.cause?.message === "test failure";
      }
      return { open, closed: !isolated.isOpen(), propagated };
    } finally {
      isolated.close();
      // This instance has a generated test-only name; never touch the app database.
      await isolated.delete();
    }
  });
  expect(result).toEqual({ open: true, closed: true, propagated: true });
});

test("movimento reduzido e foco visível nos dois temas", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const toggle = page.locator("[data-theme-toggle]");
    await toggle.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(toggle).toBeFocused();
    const styles = await toggle.evaluate((el) => ({
      transition: getComputedStyle(el).transitionDuration,
      outline: getComputedStyle(el).outlineStyle,
      outlineWidth: getComputedStyle(el).outlineWidth,
    }));
    expect(styles.transition).toBe("0s");
    expect(styles.outline).toBe("solid");
    expect(styles.outlineWidth).toBe("3px");
    await page.screenshot({ path: testInfo.outputPath(`focus-${theme}.png`) });
  }
});

test("contraste básico de tokens e ampliação de texto 200%", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const contrast = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const luminance = (token) => {
        const hex = css.getPropertyValue(token).trim().replace("#", "");
        const full =
          hex.length === 3 ? [...hex].map((x) => x + x).join("") : hex;
        const rgb = full
          .match(/../g)
          .map((x) => parseInt(x, 16) / 255)
          .map((x) =>
            x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      return [
        ["--text", "--surface", 4.5],
        ["--text-muted", "--surface", 4.5],
        ["--text-muted", "--bg", 4.5],
        ["--on-primary", "--primary", 4.5],
        ["--focus", "--surface", 3],
        ["--focus", "--bg", 3],
      ].map(([foreground, background, minimum]) => {
        const a = luminance(foreground),
          b = luminance(background);
        return {
          foreground,
          background,
          minimum,
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      });
    });
    await testInfo.attach(`contrast-${theme}.json`, {
      body: JSON.stringify(contrast, null, 2),
      contentType: "application/json",
    });
    for (const sample of contrast)
      expect(sample.ratio).toBeGreaterThanOrEqual(sample.minimum);
    // Text enlargement only. Native browser zoom is a separate manual check.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`text-200-${theme}.png`),
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  }
});
