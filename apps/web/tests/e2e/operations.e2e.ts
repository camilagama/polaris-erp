import { expect, type Page, test } from "@playwright/test";
import { createRunLabel, login, selectOption } from "./helpers";

const categoryProtectedRegex = /A categoria Outros e protegida/i;
const productDetailRouteRegex = /\/produtos\/.+/;
const productsRouteRegex = /\/produtos$/;
const price40Regex = /R\$\s*0,40/;
const price55Regex = /R\$\s*0,55/;
const price97Regex = /R\$\s*0,97/;
const price100Regex = /R\$\s*1,00/;
const price103Regex = /R\$\s*1,03/;
const price3Regex = /R\$\s*0,03/;
const priceTabRegex = /pre/i;
const productComboboxRegex = /selecionar produto da venda/i;
const salePaymentFeePayerRegex = /responsavel pela taxa do cartao/i;
const salePaymentMethodRegex = /metodo de pagamento da venda/i;
const saleDetailRouteRegex = /\/vendas\/.+/;
const settingsThreeInstallmentsRegex = /^3x$/;
const saleThreeInstallmentsRegex = /^3x no cartao$/i;

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

const openCategoriesDialog = async (page: Page) => {
  await page.getByRole("button", { name: "Gerenciar" }).click();
  const dialog = page.getByRole("dialog", { name: "Tabela de categorias" });
  await expect(dialog).toBeVisible();
  return dialog;
};

const gotoApp = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: "commit" });
};

const reloadAfterToast = async (page: Page, message: string) => {
  await expect(page.getByText(message)).toBeVisible();
  await page.reload();
};

const openProductFromList = async (page: Page, productName: string) => {
  const href = await page
    .getByRole("row", { name: new RegExp(productName) })
    .getByRole("link", { name: "Abrir" })
    .getAttribute("href");

  expect(href).toMatch(productDetailRouteRegex);
  await gotoApp(page, href ?? "/produtos");
  await expect(page).toHaveURL(productDetailRouteRegex, { timeout: 30_000 });
};

const createCategory = async (page: Page, categoryName: string) => {
  await page.getByLabel("Nova categoria").fill(categoryName);
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(page.getByText("Categoria criada.")).toBeVisible();
  await page.reload();
  const dialog = await openCategoriesDialog(page);
  await expect(dialog).toContainText(categoryName);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
};

test("creates inventory, records a sale, cancels it, and archives the product without deleting history", async ({
  page,
}) => {
  const categoryName = createRunLabel("Categoria E2E");
  const productName = createRunLabel("Produto E2E");

  await login(page);

  await gotoApp(page, "/configuracoes");
  await createCategory(page, categoryName);

  await gotoApp(page, "/produtos");
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

  await expect(page.getByText("Produto cadastrado.")).toBeVisible();
  await page.reload();
  await openProductFromList(page, productName);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("4 un.").first()).toBeVisible();
  const productDetailUrl = page.url();

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Estoque" }).click();

  const stockDialog = page.getByRole("dialog");

  await stockDialog.getByLabel("Quantidade").fill("2");
  await stockDialog.getByLabel("Custo unitario").fill("30");
  await stockDialog.getByRole("button", { name: "Confirmar entrada" }).click();
  await reloadAfterToast(page, "Estoque adicionado.");
  await expect(page.getByText("6 un.").first()).toBeVisible();

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Baixa" }).click();

  const writeOffDialog = page.getByRole("dialog");

  await writeOffDialog.getByLabel("Quantidade").fill("7");
  await expect(
    writeOffDialog.getByText("A baixa nao pode ser maior que o estoque atual.")
  ).toBeVisible();
  await expect(
    writeOffDialog.getByRole("button", { name: "Revisar baixa" })
  ).toBeDisabled();
  await writeOffDialog.getByLabel("Quantidade").fill("1");
  await writeOffDialog.getByLabel("Observacoes").fill("Baixa operacional E2E");
  await writeOffDialog.getByRole("button", { name: "Revisar baixa" }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirmar baixa" })
  ).toBeVisible();
  await writeOffDialog.getByRole("button", { name: "Confirmar baixa" }).click();
  await reloadAfterToast(page, "Baixa registrada.");
  await expect(page.getByText("5 un.").first()).toBeVisible();

  await gotoApp(page, "/vendas");
  await page.getByRole("button", { name: "Nova venda" }).click();

  const saleDialog = page.getByRole("dialog");

  await saleDialog.getByLabel("Nome do cliente (opcional)").fill("Cliente E2E");
  await selectOption(
    page,
    saleDialog.getByRole("combobox", { name: productComboboxRegex }).first(),
    new RegExp(productName)
  );
  await saleDialog.getByRole("spinbutton").first().fill("2");
  await saleDialog.getByRole("button", { name: "Confirmar venda" }).click();

  await expect(page).toHaveURL(saleDetailRouteRegex, { timeout: 30_000 });
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText("Concluida").first()).toBeVisible();

  await page.getByRole("button", { name: "Cancelar venda" }).click();
  await page.getByRole("button", { name: "Confirmar cancelamento" }).click();
  await expect(page.getByText("Cancelada").first()).toBeVisible();

  await gotoApp(page, productDetailUrl);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await expect(
    page.getByRole("dialog", { name: "Arquivar produto?" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(productDetailRouteRegex, { timeout: 30_000 });
  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Arquivar" }).click();
  await page.getByRole("button", { name: "Confirmar arquivamento" }).click();
  await expect(page).toHaveURL(productsRouteRegex, { timeout: 30_000 });
  await page
    .getByPlaceholder("Buscar por nome ou categoria")
    .first()
    .fill(productName);
  await page.getByRole("button", { name: "Aplicar busca" }).click();
  await expect(
    page.getByText("Nenhum produto corresponde aos filtros atuais.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Arquivados" }).click();
  await expect(page.getByRole("link", { name: productName })).toBeVisible();
});

test("shows the protected Outros category as non-removable in settings", async ({
  page,
}) => {
  await login(page);

  await gotoApp(page, "/configuracoes");

  await expect(page.getByText(categoryProtectedRegex).first()).toBeVisible({
    timeout: 30_000,
  });
  await openCategoriesDialog(page);
  await expect(
    page.locator('button[title="Categoria protegida pelo sistema."]').first()
  ).toBeDisabled();
});

test("updates the catalog price for future sales without changing past sale snapshots", async ({
  page,
}) => {
  const categoryName = createRunLabel("Categoria Preco");
  const productName = createRunLabel("Produto Preco");

  await login(page);

  await gotoApp(page, "/configuracoes");
  await createCategory(page, categoryName);

  await gotoApp(page, "/produtos");
  await page.getByRole("button", { name: "Cadastrar Produto" }).click();

  const productDialog = page.getByRole("dialog");

  await productDialog.getByLabel("Nome do Produto").fill(productName);
  await selectOption(
    page,
    productDialog.getByLabel("Categoria"),
    new RegExp(categoryName)
  );
  await productDialog.getByLabel("Estoque Inicial").fill("3");
  await productDialog.getByLabel("Custo Unitario").fill("25");
  await productDialog.getByLabel("Preco de Venda").fill("40");
  await productDialog.getByRole("button", { name: "Salvar Produto" }).click();
  await expect(page.getByText("Produto cadastrado.")).toBeVisible();

  await gotoApp(page, "/vendas");
  await page.getByRole("button", { name: "Nova venda" }).click();

  const firstSaleDialog = page.getByRole("dialog");

  await selectOption(
    page,
    firstSaleDialog
      .getByRole("combobox", { name: productComboboxRegex })
      .first(),
    new RegExp(productName)
  );
  await firstSaleDialog
    .getByRole("button", { name: "Confirmar venda" })
    .click();

  await expect(page).toHaveURL(saleDetailRouteRegex, { timeout: 30_000 });
  await expect(page.getByText(price40Regex).first()).toBeVisible();
  const firstSaleUrl = page.url();

  await gotoApp(page, "/produtos");
  await page
    .getByPlaceholder("Buscar por nome ou categoria")
    .first()
    .fill(productName);
  await page.getByRole("button", { name: "Aplicar busca" }).click();
  await openProductFromList(page, productName);

  await page.getByRole("button", { name: `Acoes para ${productName}` }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();

  const editDialog = page.getByRole("dialog");

  await editDialog.getByLabel("Preco de venda").fill("55");
  await editDialog.getByRole("button", { name: "Salvar alteracoes" }).click();
  await reloadAfterToast(page, "Produto atualizado.");

  await expect(page.getByText(price55Regex).first()).toBeVisible();
  await page.getByRole("tab", { name: priceTabRegex }).click();
  await expect(page.getByText(price40Regex).first()).toBeVisible();

  await gotoApp(page, "/vendas");
  await page.getByRole("button", { name: "Nova venda" }).click();

  const secondSaleDialog = page.getByRole("dialog");

  await selectOption(
    page,
    secondSaleDialog
      .getByRole("combobox", { name: productComboboxRegex })
      .first(),
    new RegExp(productName)
  );
  await secondSaleDialog
    .getByRole("button", { name: "Confirmar venda" })
    .click();

  await expect(page).toHaveURL(saleDetailRouteRegex, { timeout: 30_000 });
  await expect(page.getByText(price55Regex).first()).toBeVisible();

  await gotoApp(page, firstSaleUrl);
  await expect(page.getByText(price40Regex).first()).toBeVisible();
});

test("configures card installments and records customer-paid and seller-paid fee flows", async ({
  page,
}) => {
  const categoryName = createRunLabel("Categoria Cartao");
  const productName = createRunLabel("Produto Cartao");

  await login(page);

  await gotoApp(page, "/configuracoes");
  await createCategory(page, categoryName);

  await selectOption(
    page,
    page.getByLabel("Maximo de parcelas"),
    settingsThreeInstallmentsRegex
  );
  await page.getByRole("button", { name: "Editar taxas" }).click();
  const ratesDialog = page.getByRole("dialog");
  await ratesDialog.getByLabel("Taxa 2x (%)").fill("1.5");
  await ratesDialog.getByLabel("Taxa 3x (%)").fill("3");
  await ratesDialog.getByRole("button", { name: "Aplicar taxas" }).click();
  await page.getByRole("button", { name: "Salvar cartao" }).click();
  await expect(page.getByText("Configuracoes salvas.")).toBeVisible();

  await gotoApp(page, "/produtos");
  await page.getByRole("button", { name: "Cadastrar Produto" }).click();

  const productDialog = page.getByRole("dialog");

  await productDialog.getByLabel("Nome do Produto").fill(productName);
  await selectOption(
    page,
    productDialog.getByLabel("Categoria"),
    new RegExp(categoryName)
  );
  await productDialog.getByLabel("Estoque Inicial").fill("3");
  await productDialog.getByLabel("Custo Unitario").fill("60");
  await productDialog.getByLabel("Preco de Venda").fill("100");
  await productDialog.getByRole("button", { name: "Salvar Produto" }).click();
  await expect(page.getByText("Produto cadastrado.")).toBeVisible();

  await gotoApp(page, "/vendas");
  await page.getByRole("button", { name: "Nova venda" }).click();

  const customerFeeDialog = page.getByRole("dialog");

  await selectOption(
    page,
    customerFeeDialog.getByRole("combobox", {
      name: salePaymentMethodRegex,
    }),
    saleThreeInstallmentsRegex
  );
  await selectOption(
    page,
    customerFeeDialog.getByRole("combobox", {
      name: salePaymentFeePayerRegex,
    }),
    "Cliente"
  );
  await selectOption(
    page,
    customerFeeDialog
      .getByRole("combobox", { name: productComboboxRegex })
      .first(),
    new RegExp(productName)
  );
  await customerFeeDialog
    .getByLabel("Nome do cliente (opcional)")
    .fill("Cliente Cartao");
  await expect(customerFeeDialog.getByText(price103Regex)).toBeVisible();
  await customerFeeDialog
    .getByRole("button", { name: "Confirmar venda" })
    .click();

  await expect(page).toHaveURL(saleDetailRouteRegex, { timeout: 30_000 });
  await expect(page.getByText("Cartao 3x (cliente)")).toBeVisible();
  await expect(page.getByText("Taxa do cartao (cliente)")).toBeVisible();
  await expect(page.getByText(price103Regex).first()).toBeVisible();
  await expect(page.getByText(price100Regex).first()).toBeVisible();

  await gotoApp(page, "/vendas");
  await page.getByRole("button", { name: "Nova venda" }).click();

  const sellerFeeDialog = page.getByRole("dialog");

  await selectOption(
    page,
    sellerFeeDialog.getByRole("combobox", {
      name: salePaymentMethodRegex,
    }),
    saleThreeInstallmentsRegex
  );
  await selectOption(
    page,
    sellerFeeDialog.getByRole("combobox", {
      name: salePaymentFeePayerRegex,
    }),
    "Vendedor"
  );
  await selectOption(
    page,
    sellerFeeDialog
      .getByRole("combobox", { name: productComboboxRegex })
      .first(),
    new RegExp(productName)
  );
  await sellerFeeDialog
    .getByRole("button", { name: "Confirmar venda" })
    .click();

  await expect(page.getByText("Venda registrada.")).toBeVisible();
  await gotoApp(page, "/vendas");
  const sellerSaleHref = await page
    .getByRole("link", { name: "Abrir" })
    .first()
    .getAttribute("href");
  expect(sellerSaleHref).toMatch(saleDetailRouteRegex);
  await gotoApp(page, sellerSaleHref ?? "/vendas");
  await expect(page).toHaveURL(saleDetailRouteRegex, { timeout: 30_000 });
  await expect(page.getByText("Cartao 3x (vendedor)")).toBeVisible();
  await expect(page.getByText("Taxa do cartao (vendedor)")).toBeVisible();
  await expect(page.getByText(price3Regex).first()).toBeVisible();
  await expect(page.getByText(price97Regex).first()).toBeVisible();
});
