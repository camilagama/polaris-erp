import {
  type APIRequestContext,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

import { E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET } from "./constants";

const e2eBaseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const e2eUserName = process.env.E2E_NAME ?? "Polaris E2E";
const e2eBootstrapSecret =
  process.env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;

const parseSetCookieHeader = (cookieHeader: string) => {
  const [nameValue, ...attributeEntries] = cookieHeader.split("; ");
  const separatorIndex = nameValue.indexOf("=");

  if (separatorIndex === -1) {
    throw new Error(`Set-Cookie invalido: ${cookieHeader}`);
  }

  const name = nameValue.slice(0, separatorIndex);
  const value = nameValue.slice(separatorIndex + 1);
  const attributes = new Map(
    attributeEntries.map((entry) => {
      const attributeSeparatorIndex = entry.indexOf("=");

      if (attributeSeparatorIndex === -1) {
        return [entry.toLowerCase(), "true"] as const;
      }

      return [
        entry.slice(0, attributeSeparatorIndex).toLowerCase(),
        entry.slice(attributeSeparatorIndex + 1),
      ] as const;
    })
  );
  const sameSite = attributes.get("samesite")?.toLowerCase();
  let normalizedSameSite: "Lax" | "None" | "Strict" = "Lax";

  if (sameSite === "strict") {
    normalizedSameSite = "Strict";
  } else if (sameSite === "none") {
    normalizedSameSite = "None";
  }

  return {
    domain: attributes.get("domain") ?? new URL(e2eBaseUrl).hostname,
    expires: attributes.get("expires")
      ? Math.floor(Date.parse(attributes.get("expires") ?? "") / 1000)
      : undefined,
    httpOnly: attributes.has("httponly"),
    name,
    path: attributes.get("path") ?? "/",
    sameSite: normalizedSameSite,
    secure: attributes.has("secure"),
    value,
  } as const;
};

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
      cookieHeaders.map((cookieHeader) => parseSetCookieHeader(cookieHeader))
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

  await page
    .waitForFunction(
      () =>
        document.body.innerText.includes("Criar organizacao") ||
        document.body.innerText.includes("Assinatura necessaria") ||
        document.body.innerText.includes("Dashboard"),
      undefined,
      { timeout: 5000 }
    )
    .catch(() => undefined);

  const onboardingHeading = page.getByRole("heading", {
    name: "Criar organizacao",
  });
  const needsOnboarding = await onboardingHeading.isVisible();

  if (needsOnboarding) {
    await page
      .getByLabel("Nome da organizacao")
      .fill(createRunLabel("Organizacao E2E"));
    await page.getByRole("button", { name: "Comecar" }).click();
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Assinatura necessaria") ||
        document.body.innerText.includes("Dashboard"),
      undefined,
      { timeout: 5000 }
    );
  }

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
