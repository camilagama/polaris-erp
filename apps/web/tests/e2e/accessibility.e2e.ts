import { expect, test } from "@playwright/test";
import {
  createRunLabel,
  expectNoWcagViolations,
  login,
  selectOption,
  setTheme,
} from "./helpers";

const productComboboxRegex = /selecionar produto da venda/i;
const darkThemeClassRegex = /\bdark\b/;
const lightThemeClassRegex = /\blight\b/;
const otherCategoryRegex = /Outros/i;

test("scans inventory and sale surfaces in both themes", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, async (checkpointPage) =>
    expectNoWcagViolations(checkpointPage)
  );
  await expect(page.locator("html")).toHaveClass(darkThemeClassRegex);

  const productName = createRunLabel("Produto acessibilidade E2E");

  await page.goto("/produtos");
  await page.getByRole("button", { name: "Cadastrar Produto" }).click();

  const darkProductDialog = page.getByRole("dialog");

  await expect(darkProductDialog).toBeVisible();
  await expectNoWcagViolations(page);
  await darkProductDialog.getByLabel("Nome do Produto").fill(productName);
  await selectOption(
    page,
    darkProductDialog.getByLabel("Categoria"),
    otherCategoryRegex
  );
  await darkProductDialog.getByLabel("Estoque Inicial").fill("1");
  await darkProductDialog.getByLabel("Custo Unitario").fill("10");
  await darkProductDialog.getByLabel("Preco de Venda").fill("20");
  await expectNoWcagViolations(page);
  await darkProductDialog
    .getByRole("button", { name: "Salvar Produto" })
    .click();
  await expect(page.getByText("Produto cadastrado.")).toBeVisible();
  await page.reload();
  await expectNoWcagViolations(page);

  await page.goto("/vendas");
  const darkSaleTrigger = page.getByRole("button", { name: "Nova venda" });
  await darkSaleTrigger.click();

  const darkSaleDialog = page.getByRole("dialog");

  await expect(darkSaleDialog).toBeVisible();
  await expect(darkSaleDialog.getByLabel("Qtd.")).toHaveCount(1);
  await expectNoWcagViolations(page);
  const darkProductCombobox = darkSaleDialog
    .getByRole("combobox", { name: productComboboxRegex })
    .first();
  await darkProductCombobox.click();
  await expect(
    page.getByRole("option", { name: new RegExp(productName) })
  ).toBeVisible();
  await expectNoWcagViolations(page);
  await page.getByRole("option", { name: new RegExp(productName) }).click();
  await expectNoWcagViolations(page);
  await page.keyboard.press("Escape");
  await expect(darkSaleDialog).toBeHidden();
  await expect(darkSaleTrigger).toBeFocused();

  await setTheme(page, "light");
  await page.goto("/produtos");
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  await expectNoWcagViolations(page);
  const lightProductTrigger = page.getByRole("button", {
    name: "Cadastrar Produto",
  });
  await lightProductTrigger.click();

  const lightProductDialog = page.getByRole("dialog");

  await expect(lightProductDialog).toBeVisible();
  await expectNoWcagViolations(page);
  await page.keyboard.press("Escape");
  await expect(lightProductDialog).toBeHidden();
  await expect(lightProductTrigger).toBeFocused();

  await page.goto("/vendas");
  await expect(page.locator("html")).toHaveClass(lightThemeClassRegex);
  const lightSaleTrigger = page.getByRole("button", { name: "Nova venda" });
  await lightSaleTrigger.click();

  const lightSaleDialog = page.getByRole("dialog");

  await expect(lightSaleDialog).toBeVisible();
  await expectNoWcagViolations(page);
  const lightProductCombobox = lightSaleDialog
    .getByRole("combobox", { name: productComboboxRegex })
    .first();
  await lightProductCombobox.click();
  await expect(
    page.getByRole("option", { name: new RegExp(productName) })
  ).toBeVisible();
  await expectNoWcagViolations(page);
  await page.getByRole("option", { name: new RegExp(productName) }).click();
  await expectNoWcagViolations(page);
  await page.keyboard.press("Escape");
  await expect(lightSaleDialog).toBeHidden();
  await expect(lightSaleTrigger).toBeFocused();
});
