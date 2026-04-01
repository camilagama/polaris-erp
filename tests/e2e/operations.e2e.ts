import { expect, test } from "@playwright/test";
import { createRunLabel, login, selectOption } from "./helpers";

const categoryProtectedRegex = /A categoria Outros e protegida/i;
const productDetailRouteRegex = /\/produtos\/.+/;
const productsRouteRegex = /\/produtos$/;
const saleDetailRouteRegex = /\/vendas\/.+/;

test("creates inventory, records a sale, cancels it, and requires typed confirmation before destructive deletion", async ({
  page,
}) => {
  const categoryName = createRunLabel("Categoria E2E");
  const productName = createRunLabel("Produto E2E");

  await login(page);

  await page.goto("/configuracoes");
  await page.getByLabel("Nova categoria").fill(categoryName);
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(page.getByText(categoryName)).toBeVisible();

  await page.goto("/produtos");
  await page.getByRole("button", { name: "Cadastrar Produto" }).click();

  const productDialog = page.getByRole("dialog");

  await productDialog.getByLabel("Nome do Produto").fill(productName);
  await selectOption(
    page,
    productDialog.getByLabel("Categoria"),
    new RegExp(categoryName)
  );
  await productDialog.getByLabel("Estoque Inicial").fill("4");
  await productDialog.getByLabel("Custo Unitario").fill("25");
  await productDialog.getByLabel("Preco de Venda").fill("40");
  await productDialog.getByRole("button", { name: "Salvar Produto" }).click();

  await expect(page.getByRole("link", { name: productName })).toBeVisible();

  await page.getByRole("link", { name: productName }).click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.getByText("4 un.").first()).toBeVisible();

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Estoque" }).click();

  const stockDialog = page.getByRole("dialog");

  await stockDialog.getByLabel("Quantidade").fill("2");
  await stockDialog.getByLabel("Custo unitario").fill("30");
  await stockDialog.getByRole("button", { name: "Confirmar entrada" }).click();
  await expect(page.getByText("6 un.").first()).toBeVisible();

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Baixa" }).click();

  const writeOffDialog = page.getByRole("dialog");

  await writeOffDialog.getByLabel("Quantidade").fill("1");
  await writeOffDialog.getByLabel("Observacoes").fill("Baixa operacional E2E");
  await writeOffDialog.getByRole("button", { name: "Confirmar baixa" }).click();
  await expect(page.getByText("5 un.").first()).toBeVisible();

  await page.goto("/vendas");
  await page.getByRole("button", { name: "Nova venda" }).click();

  const saleDialog = page.getByRole("dialog");

  await saleDialog.getByLabel("Nome do cliente (opcional)").fill("Cliente E2E");
  await selectOption(
    page,
    saleDialog.getByRole("combobox").nth(1),
    new RegExp(productName)
  );
  await saleDialog.getByRole("spinbutton").first().fill("2");
  await saleDialog.getByRole("button", { name: "Confirmar venda" }).click();

  await expect(page).toHaveURL(saleDetailRouteRegex);
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText("Concluida").first()).toBeVisible();

  await page.getByRole("button", { name: "Cancelar venda" }).click();
  await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
  await expect(page.getByText("Cancelada").first()).toBeVisible();

  await page.goto("/produtos");
  await page.getByPlaceholder("Buscar por nome ou categoria").fill(productName);
  await page.getByRole("link", { name: productName }).click();
  await expect(page).toHaveURL(productDetailRouteRegex);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Deletar" }).click();

  const deleteDialog = page.getByRole("alertdialog");
  const deleteButton = deleteDialog.getByRole("button", {
    name: "Deletar produto e vendas",
  });

  await expect(deleteButton).toBeDisabled();
  await deleteDialog
    .getByLabel("Digite o nome do produto para confirmar")
    .fill(productName);
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();

  await expect(page).toHaveURL(productsRouteRegex);
  await page.getByPlaceholder("Buscar por nome ou categoria").fill(productName);
  await expect(page.getByText("Nenhum produto encontrado.")).toBeVisible();
});

test("shows the protected Outros category as non-removable in settings", async ({
  page,
}) => {
  await login(page);

  await page.goto("/configuracoes");

  await expect(page.getByText(categoryProtectedRegex).first()).toBeVisible();
  await expect(
    page.locator('button[title="Categoria protegida pelo sistema."]').first()
  ).toBeDisabled();
});
