import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  parseE2eSetCookie,
} from "@polaris/e2e-support";

const e2eBaseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const e2eUserName = process.env.E2E_NAME ?? "Polaris E2E";
const e2eBootstrapSecret =
  process.env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;

const createE2EUser = () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    email: `e2e+${runId}@dgimports.local`,
    name: e2eUserName,
  };
};

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

export const login = async (page: Page) => {
  const e2eUser = createE2EUser();

  await page.context().clearCookies();
  const response = await ensureE2EUser(page.request, e2eUser);
  await applyBootstrapCookies(page, response);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Crie seu espaço" })
  ).toBeVisible();
  await page
    .getByLabel("Nome da organização")
    .fill(createRunLabel("Organização E2E"));
  await page.getByRole("button", { exact: true, name: "Continuar" }).click();

  await expect(
    page.getByRole("heading", { name: "Escolha como começar" })
  ).toBeVisible();
  await page
    .getByRole("link", { exact: true, name: "Continuar no Free" })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "Dashboard",
    })
  ).toBeVisible();
};

export const selectOption = async (
  page: Page,
  trigger: Locator,
  optionName: string | RegExp
) => {
  await trigger.click();
  await page.getByRole("option", { name: optionName }).click();
};
