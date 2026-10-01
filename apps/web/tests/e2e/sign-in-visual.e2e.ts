import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

const googleSignInLinkRegex = /Continuar com Google/;
const darkThemeClassRegex = /\bdark\b/;

test.use({
  colorScheme: "dark",
  deviceScaleFactor: 1,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  viewport: { height: 900, width: 1440 },
});

test.skip(
  process.env.GITHUB_ACTIONS !== "true" || process.platform !== "linux",
  "Visual baselines use the canonical Linux CI runtime."
);

test.describe.configure({ retries: 0 });

test("matches the unauthenticated Web sign-in baseline", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    if (window.location.origin !== "null") {
      window.localStorage.setItem("theme", "dark");
    }
  });
  await page.route("https://accounts.google.com/**", (route) => route.abort());
  await page.goto("/sign-in");

  await expect(
    page.getByRole("link", { name: googleSignInLinkRegex })
  ).toBeVisible();
  await expect(page.locator("html")).toHaveClass(darkThemeClassRegex);

  const main = page.getByRole("main");

  await expect(main).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.mouse.move(1439, 899);

  const snapshotPath = testInfo.snapshotPath("web-sign-in.png");

  if (!existsSync(snapshotPath)) {
    await testInfo.attach("web-sign-in-baseline-candidate", {
      body: await main.screenshot({ animations: "disabled", caret: "hide" }),
      contentType: "image/png",
    });
  }

  await expect(main).toHaveScreenshot("web-sign-in.png", {
    animations: "disabled",
    caret: "hide",
  });
});
