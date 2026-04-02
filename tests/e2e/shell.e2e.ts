import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const gsiWarningRegex = /GSI_LOGGER|origin is not allowed/i;
const localOneTapDisabledRegex = /One Tap fica desativado localmente/i;
const rootRouteRegex = /\/$/;
const signInRouteRegex = /\/sign-in$/;

test("redirects unauthenticated protected routes to sign-in", async ({
  page,
}) => {
  await page.goto("/produtos");

  await expect(page).toHaveURL(signInRouteRegex);
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("keeps the local sign-in screen usable without Google One Tap noise", async ({
  page,
}) => {
  const gsiMessages: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (gsiWarningRegex.test(text)) {
      gsiMessages.push(text);
    }
  });

  await page.goto("/sign-in");

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByText(localOneTapDisabledRegex)).toBeVisible();
  expect(gsiMessages).toEqual([]);
});

test("signs in with a prepared E2E account and lands on the dashboard", async ({
  page,
}) => {
  await login(page);

  await expect(page).toHaveURL(rootRouteRegex);
  await expect(page.getByText("Periodo do dashboard")).toBeVisible();
});

test("renders the global not-found screen for unknown routes", async ({
  page,
}) => {
  await page.goto("/rota-inexistente");

  await expect(
    page.getByRole("heading", {
      name: "Esta pagina nao existe no fluxo atual.",
    })
  ).toBeVisible();
});
