import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

const e2eBaseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const e2ePassword = process.env.E2E_PASSWORD ?? "CodexE2E!12345";
const e2eUserName = process.env.E2E_NAME ?? "DG Imports E2E";

const createE2EUser = () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    email: `e2e+${runId}@dgimports.local`,
    name: e2eUserName,
    password: e2ePassword,
  };
};

const ensureE2EUser = async (
  request: APIRequestContext,
  user: ReturnType<typeof createE2EUser>
) => {
  const signUpResponse = await request.post(
    `${e2eBaseUrl}/api/auth/sign-up/email`,
    {
      data: user,
      headers: {
        origin: e2eBaseUrl,
      },
    }
  );

  if (signUpResponse.ok()) {
    return;
  }

  const signUpBody = await signUpResponse.text();

  throw new Error(
    `Nao foi possivel preparar o usuario E2E. sign-up: ${signUpResponse.status()} ${signUpBody}`
  );
};

export const createRunLabel = (prefix: string) =>
  `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;

export const login = async (page: Page) => {
  const e2eUser = createE2EUser();

  await ensureE2EUser(page.request, e2eUser);
  await page.context().clearCookies();
  await page.goto("/sign-in");

  await page.getByLabel("Email").fill(e2eUser.email);
  await page.getByLabel("Senha").fill(e2eUser.password);
  await page.getByRole("button", { name: "Entrar no painel" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Visao rapida da operacao de hoje",
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
