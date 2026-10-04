import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
  E2E_ADMIN_BASE_URL,
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  parseE2eSetCookie,
} from "@polaris/e2e-support";

const e2eAdminBaseUrl = E2E_ADMIN_BASE_URL;
const e2eBootstrapSecret = E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;
const darkThemeClassRegex = /\bdark\b/;
const lightThemeClassRegex = /\blight\b/;
const openInvoiceSummaryRegex = /invoices em aberto/;
const wcagAaTags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

const expectNoWcagViolations = async (page: Page): Promise<void> => {
  const results = await new AxeBuilder({ page })
    .options({
      runOnly: { type: "tag", values: [...wcagAaTags] },
      // axe-core disables WCAG 2.2 target-size by default.
      rules: { "target-size": { enabled: true } },
    })
    .analyze();
  const violations = results.violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.map(({ target }) => target),
  }));
  const manualReview = results.incomplete.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(({ target }) => target),
  }));

  // Incomplete results are manual-review candidates, not confirmed violations.
  if (manualReview.length > 0) {
    console.info(`[axe-manual-review] ${JSON.stringify(manualReview)}`);
  }
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
};

const setTheme = async (page: Page, theme: "dark" | "light"): Promise<void> => {
  await page.getByRole("button", { name: "Alterar tema" }).click();
  await page
    .getByRole("menuitem", { name: theme === "dark" ? "Escuro" : "Claro" })
    .click();
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
};

const loginAsPlatformAdmin = async (
  page: Page,
  role: "owner" | "operator" | "support" = "owner"
) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await page.request.post(
    `${e2eAdminBaseUrl}/api/dev/bootstrap-platform-admin`,
    {
      data: {
        email: `admin-e2e+${runId}@dgimports.local`,
        name: "Polaris Admin E2E",
        role,
      },
      headers: {
        authorization: `Bearer ${e2eBootstrapSecret}`,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Nao foi possivel preparar platform admin E2E: ${response.status()} ${await response.text()}`
    );
  }

  const cookieHeaders = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value);

  if (cookieHeaders.length === 0) {
    throw new Error("Bootstrap admin E2E nao retornou cookies de sessao.");
  }

  await page
    .context()
    .addCookies(
      cookieHeaders.map((cookieHeader) =>
        parseE2eSetCookie(cookieHeader, e2eAdminBaseUrl)
      )
    );
};

test("redirects unauthenticated users to the admin sign-in", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Entrar no admin" })
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(darkThemeClassRegex);
  await expectNoWcagViolations(page);
});

test("keeps the admin sign-in accessible in the light theme", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Entrar no admin" })
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expectNoWcagViolations(page);
});

test("allows a bootstrapped platform admin to open the internal dashboard", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await loginAsPlatformAdmin(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Console operacional" })
  ).toBeVisible();
  await expect(page.getByText(openInvoiceSummaryRegex)).toBeVisible();
  await expect(page.locator("html")).toHaveClass(darkThemeClassRegex);
  await expectNoWcagViolations(page);
  await expect(
    page.getByRole("link", { exact: true, name: "Organizações" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Usuários" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Auditoria" })
  ).toBeVisible();

  await page.goto("/organizations");
  await expect(page.getByRole("heading", { name: "Tenants" })).toBeVisible();
  await expectNoWcagViolations(page);

  await page.goto("/users");
  await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
  await expectNoWcagViolations(page);

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
  const auditTable = page.getByRole("table", {
    name: "Eventos de auditoria da plataforma",
  });
  await expect(auditTable).toBeVisible();
  await expect(
    auditTable.getByRole("columnheader", { name: "Action" })
  ).toBeVisible();
  await expect(
    auditTable.getByRole("columnheader", { name: "Subject" })
  ).toBeVisible();
  await expectNoWcagViolations(page);

  await setTheme(page, "light");
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expectNoWcagViolations(page);
  await page.goto("/organizations");
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expectNoWcagViolations(page);
  await page.goto("/users");
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expectNoWcagViolations(page);
  await page.goto("/audit");
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expectNoWcagViolations(page);
});

for (const role of ["operator", "support"] as const) {
  test(`allows a bootstrapped ${role} platform admin to open the dashboard`, async ({
    page,
  }) => {
    await loginAsPlatformAdmin(page, role);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Console operacional" })
    ).toBeVisible();
  });
}
