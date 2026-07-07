// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogSettingsPanel } from "@/components/settings/catalog-settings-panel";
import type {
  CatalogCategory,
  CatalogSettings,
} from "@/features/catalog/server";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const renderPanel = () => {
  const container = document.createElement("div");
  document.body.append(container);

  let root: Root | null = null;
  act(() => {
    root = createRoot(container);
    root.render(createElement(CatalogSettingsPanel, { categories, settings }));
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
      root?.unmount();
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
      root?.unmount();
    });
  });
});
