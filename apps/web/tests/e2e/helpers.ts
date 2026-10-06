import AxeBuilder from "@axe-core/playwright";
import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  E2E_WEB_BASE_URL,
  parseE2eSetCookie,
} from "@polaris/e2e-support";

const e2eBaseUrl = E2E_WEB_BASE_URL;
const e2eUserName = process.env.E2E_NAME ?? "Polaris E2E";
const e2eBootstrapSecret = E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;
const e2eNavigationTimeoutMs = 15_000;
const WCAG_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
] as const;

export const expectNoWcagViolations = async (page: Page): Promise<void> => {
  const results = await new AxeBuilder({ page })
    .options({
      runOnly: { type: "tag", values: [...WCAG_AA_TAGS] },
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

export const setTheme = async (
  page: Page,
  theme: "dark" | "light"
): Promise<void> => {
  await page.getByRole("button", { name: "Alterar tema" }).click();
  await page
    .getByRole("menuitem", { name: theme === "dark" ? "Escuro" : "Claro" })
    .click();
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
};

const createE2EUser = () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    email: `e2e+${runId}@dgimports.local`,
    name: e2eUserName,
  };
};

export type LoginCheckpoint = "organization-setup" | "plan-selection";
type LoginCheckpointHandler = (
  page: Page,
  checkpoint: LoginCheckpoint
) => Promise<void>;

const ensureE2EUser = async (
  request: APIRequestContext,
  user: ReturnType<typeof createE2EUser>
) => {
  const signInResponse = await request.post(
    `${e2eBaseUrl}/api/auth/dev/bootstrap-session`,
    {
      data: user,
      headers: {
        authorization: `Bearer ${e2eBootstrapSecret}`,
      },
    }
  );

  if (signInResponse.ok()) {
    return signInResponse;
  }

  const signInBody = await signInResponse.text();

  throw new Error(
    `Nao foi possivel preparar a sessao E2E. bootstrap: ${signInResponse.status()} ${signInBody}`
  );
};

const applyBootstrapCookies = async (
  page: Page,
  response: Awaited<ReturnType<APIRequestContext["post"]>>
) => {
  const cookieHeaders = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value);

  if (cookieHeaders.length === 0) {
    throw new Error("Bootstrap E2E nao retornou cookies de sessao.");
  }

  await page
    .context()
    .addCookies(
      cookieHeaders.map((cookieHeader) =>
        parseE2eSetCookie(cookieHeader, e2eBaseUrl)
      )
    );
};

export const createRunLabel = (prefix: string) =>
  `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;

export const login = async (
  page: Page,
  onCheckpoint?: LoginCheckpointHandler
) => {
  const e2eUser = createE2EUser();

  await page.context().clearCookies();
  const response = await ensureE2EUser(page.request, e2eUser);
  await applyBootstrapCookies(page, response);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Crie seu espaço" })
  ).toBeVisible();
  await onCheckpoint?.(page, "organization-setup");
  await page
    .getByLabel("Nome da organização")
    .fill(createRunLabel("Organização E2E"));
  await page.getByRole("button", { exact: true, name: "Continuar" }).click();

  await expect(
    page.getByRole("heading", { name: "Escolha como começar" })
  ).toBeVisible({ timeout: e2eNavigationTimeoutMs });
  await onCheckpoint?.(page, "plan-selection");
  await page
    .getByRole("link", { exact: true, name: "Continuar no Free" })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "Dashboard",
    })
  ).toBeVisible({ timeout: e2eNavigationTimeoutMs });
};

export const selectOption = async (
  page: Page,
  trigger: Locator,
  optionName: string | RegExp
) => {
  await trigger.click();
  await page.getByRole("option", { name: optionName }).click();
};
