// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSettingsPanel } from "@/components/settings/catalog-settings-panel";
import type {
  CatalogCategory,
  CatalogSettings,
} from "@/features/catalog/server";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const settingsMocks = vi.hoisted(() => ({
  createCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
  saveCatalogSettingsAction: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateCategoryAction: vi.fn(),
}));

vi.mock("@/features/catalog/actions", () => ({
  createCategoryAction: settingsMocks.createCategoryAction,
  deleteCategoryAction: settingsMocks.deleteCategoryAction,
  saveCatalogSettingsAction: settingsMocks.saveCatalogSettingsAction,
  updateCategoryAction: settingsMocks.updateCategoryAction,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: {
    error: settingsMocks.toastError,
    success: settingsMocks.toastSuccess,
  },
}));

const categories: CatalogCategory[] = [
  {
    description: null,
    id: "category-1",
    isSystem: true,
    key: "outros",
    name: "Outros",
    productCount: 0,
  },
];

const settings: CatalogSettings = {
  cardInstallmentRules: [
    { feePercent: 0, installments: 1 },
    { feePercent: 2.5, installments: 2 },
  ],
  idealMarkupPercent: 100,
  minimumMarkupPercent: 30,
};

const customCategory: CatalogCategory = {
  description: null,
  id: "category-2",
  isSystem: false,
  key: "smartphones",
  name: "Smartphones",
  productCount: 0,
};

const renderPanel = (panelCategories = categories) => {
  const container = document.createElement("div");
  document.body.append(container);

  const root: Root = createRoot(container);
  act(() => {
    root.render(
      createElement(CatalogSettingsPanel, {
        categories: panelCategories,
        settings,
      })
    );
  });

  return { container, root };
};

const clickButton = async (label: string) => {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.textContent === label
  );

  expect(button).toBeTruthy();

  await act(async () => {
    button?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    await Promise.resolve();
  });
};

const clickButtonByTitle = async (title: string) => {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.getAttribute("title") === title
  );

  expect(button).toBeTruthy();

  await act(async () => {
    button?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    await Promise.resolve();
  });
};

const changeInputValue = async (id: string, value: string) => {
  const input = document.getElementById(id) as HTMLInputElement | null;

  expect(input).toBeTruthy();

  await act(async () => {
    if (input) {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      valueSetter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await Promise.resolve();
  });
};

describe("CatalogSettingsPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("discards card fee edits when the rates dialog is cancelled", async () => {
    const { root } = renderPanel();

    await clickButton("Editar taxas");
    await changeInputValue("card-fee-2", "9.99");
    await clickButton("Cancelar");
    await clickButton("Salvar cartao");

    expect(settingsMocks.saveCatalogSettingsAction).toHaveBeenCalledWith({
      cardInstallmentRules: [
        { feePercent: 0, installments: 1 },
        { feePercent: 2.5, installments: 2 },
      ],
      idealMarkupPercent: 100,
      minimumMarkupPercent: 30,
    });

    act(() => {
      root.unmount();
    });
  });

  it("applies card fee edits locally before the explicit card save", async () => {
    const { root } = renderPanel();

    await clickButton("Editar taxas");
    await changeInputValue("card-fee-2", "9.99");
    await clickButton("Aplicar taxas");
    await clickButton("Salvar cartao");

    expect(settingsMocks.saveCatalogSettingsAction).toHaveBeenCalledWith({
      cardInstallmentRules: [
        { feePercent: 0, installments: 1 },
        { feePercent: 9.99, installments: 2 },
      ],
      idealMarkupPercent: 100,
      minimumMarkupPercent: 30,
    });

    act(() => {
      root.unmount();
    });
  });

  it("requires explicit confirmation before deleting a custom category", async () => {
    const { root } = renderPanel([categories[0], customCategory]);

    await clickButton("Gerenciar");
    await clickButtonByTitle("Remover categoria");

    expect(settingsMocks.deleteCategoryAction).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Remover Smartphones?");
    expect(document.body.textContent).toContain(
      "Esta acao remove a categoria do catalogo."
    );

    await clickButton("Remover categoria");

    expect(settingsMocks.deleteCategoryAction).toHaveBeenCalledWith(
      "category-2"
    );

    act(() => {
      root.unmount();
    });
  });
});
