import { expect, test } from "@playwright/test";
import { expectNoWcagViolations, login, setTheme } from "./helpers";

const gsiWarningRegex = /origin is not allowed/i;
const implicitGoogleAccountRegex = /sua conta será criada automaticamente/i;
const googleContinueRegex = /Continuar com Google/;
const rootRouteRegex = /\/$/;
const signInRouteRegex = /\/sign-in$/;
const darkThemeClassRegex = /\bdark\b/;
const lightThemeClassRegex = /\blight\b/;

test("redirects unauthenticated protected routes to sign-in", async ({
  page,
}) => {
  await page.goto("/produtos");

  await expect(page).toHaveURL(signInRouteRegex);
  await expect(
    page.getByRole("link", { name: googleContinueRegex })
  ).toBeVisible();
});

test("keeps the local sign-in screen usable without Google client noise", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  const gsiMessages: string[] = [];

  page.on("console", (message) => {
    const text = message.text();

    if (gsiWarningRegex.test(text)) {
      gsiMessages.push(text);
    }
  });

  await page.goto("/sign-in");

  await expect(
    page.getByRole("link", { name: googleContinueRegex })
  ).toBeVisible();
  await expect(page.getByText(implicitGoogleAccountRegex)).toBeVisible();
  await expect(page.locator("html")).toHaveClass(darkThemeClassRegex);
  expect(gsiMessages).toEqual([]);
  await expectNoWcagViolations(page);
});

test("keeps the local sign-in screen accessible in the light theme", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/sign-in");

  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expect(
    page.getByRole("link", { name: googleContinueRegex })
  ).toBeVisible();
  await expectNoWcagViolations(page);
});

test("signs in with a prepared E2E account and lands on the dashboard", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await login(page);

  await expect(page).toHaveURL(rootRouteRegex);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(darkThemeClassRegex);
  await expectNoWcagViolations(page);

  await setTheme(page, "light");
  await expectNoWcagViolations(page);
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
