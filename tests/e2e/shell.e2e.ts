import { expect, test } from "@playwright/test";

const signInRouteRegex = /\/sign-in$/;

test("redirects unauthenticated protected routes to sign-in", async ({
  page,
}) => {
  await page.goto("/produtos");

  await expect(page).toHaveURL(signInRouteRegex);
  await expect(
    page.getByRole("heading", {
      name: "Entrar",
    })
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
