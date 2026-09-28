import { expect, type Page, test } from "@playwright/test";
import {
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET,
  parseE2eSetCookie,
} from "@polaris/e2e-support";

const e2eAdminBaseUrl =
  process.env.E2E_ADMIN_BASE_URL ?? "http://127.0.0.1:3002";
const e2eBootstrapSecret =
  process.env.E2E_INTERNAL_BOOTSTRAP_SECRET ??
  E2E_DEFAULT_INTERNAL_BOOTSTRAP_SECRET;

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
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Entrar no admin" })
  ).toBeVisible();
});

test("allows a bootstrapped platform admin to open the internal dashboard", async ({
  page,
}) => {
  await loginAsPlatformAdmin(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Console operacional" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Organizações" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Usuários" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { exact: true, name: "Auditoria" })
  ).toBeVisible();
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
