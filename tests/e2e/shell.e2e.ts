import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const gsiWarningRegex = /GSI_LOGGER|origin is not allowed/i;
const implicitGoogleAccountRegex = /sua conta sera criada automaticamente/i;
const rootRouteRegex = /\/$/;
const signInRouteRegex = /\/sign-in$/;

test("redirects unauthenticated protected routes to sign-in", async ({
  page,
}) => {
  await page.goto("/produtos");

  await expect(page).toHaveURL(signInRouteRegex);
  await expect(
    page.getByRole("button", { name: "Continuar com Google" })
  ).toBeVisible();
});

test("keeps the local sign-in screen usable without Google client noise", async ({
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

  await expect(
    page.getByRole("button", { name: "Continuar com Google" })
  ).toBeVisible();
  await expect(page.getByText(implicitGoogleAccountRegex)).toBeVisible();
  expect(gsiMessages).toEqual([]);
});

test("signs in with a prepared E2E account and lands on the dashboard", async ({
  page,
}) => {
  await login(page);

  await expect(page).toHaveURL(rootRouteRegex);
  await expect(
    page.getByRole("heading", { name: "Visao geral" })
  ).toBeVisible();
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
