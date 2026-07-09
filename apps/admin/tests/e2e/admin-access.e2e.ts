import { expect, type Page, test } from "@playwright/test";
import { E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET } from "../../../web/tests/e2e/constants";

const e2eAdminBaseUrl =
  process.env.E2E_ADMIN_BASE_URL ?? "http://127.0.0.1:3002";
const e2eBootstrapSecret =
  process.env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;
const organizationsLinkRegex = /Organizacoes/i;
const usersLinkRegex = /Usuarios/i;
const auditLinkRegex = /Auditoria/i;

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
    domain: attributes.get("domain") ?? new URL(e2eAdminBaseUrl).hostname,
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

const loginAsPlatformAdmin = async (page: Page) => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await page.request.post(
    `${e2eAdminBaseUrl}/api/dev/bootstrap-platform-admin`,
    {
      data: {
        email: `admin-e2e+${runId}@dgimports.local`,
        name: "Polaris Admin E2E",
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
      cookieHeaders.map((cookieHeader) => parseSetCookieHeader(cookieHeader))
    );
};

test("blocks unauthenticated users from the internal admin", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Admin interno protegido" })
  ).toBeVisible();
  await expect(page.getByText("Acesso negado")).toBeVisible();
});

test("allows a bootstrapped platform admin to open the internal dashboard", async ({
  page,
}) => {
  await loginAsPlatformAdmin(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Admin interno" })
  ).toBeVisible();
  await expect(page.getByText("Acesso verificado")).toBeVisible();
  await expect(
    page.getByRole("link", { name: organizationsLinkRegex })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: usersLinkRegex })).toBeVisible();
  await expect(page.getByRole("link", { name: auditLinkRegex })).toBeVisible();
});
