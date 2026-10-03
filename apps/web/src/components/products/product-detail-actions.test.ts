// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import type { ProductListItem } from "@/features/products/contracts";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const actionMocks = vi.hoisted(() => ({
  archiveProductAction: vi.fn(),
  softDeleteProductAction: vi.fn(),
  writeOffProductStockAction: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/features/products/actions", () => ({
  addProductStockAction: vi.fn(),
  archiveProductAction: actionMocks.archiveProductAction,
  removeProductImageAction: vi.fn(),
  replaceProductImageAction: vi.fn(),
  softDeleteProductAction: actionMocks.softDeleteProductAction,
  unarchiveProductAction: vi.fn(),
  updateProductAction: vi.fn(),
  writeOffProductStockAction: actionMocks.writeOffProductStockAction,
}));

vi.mock("@/components/products/product-image-upload", () => ({
  uploadProductImageToStaging: vi.fn(),
}));

vi.mock("@polaris/ui/components/ui/sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const product: ProductListItem = {
  archivedAt: null,
  categoryId: "category-1",
  categoryName: "Categoria",
  costPrice: "10.00",
  createdAt: new Date("2026-03-31T00:00:00.000Z"),
  description: null,
  id: "product-1",
  image: null,
  name: "Produto teste",
  price: "20.00",
  purchasedOn: "2026-03-31",
  stock: 2,
};

const mountedRoots: Root[] = [];

const renderComponent = () => {
  const container = document.createElement("div");
  document.body.append(container);

  const root: Root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      createElement(ProductDetailActions, {
        categories: [{ id: "category-1", name: "Categoria" }],
        product,
        settings: {
          idealMarkupPercent: 100,
          minimumMarkupPercent: 30,
        },
      })
    );
  });

  return { container, root };
};

const clickElement = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
    );
    element.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    await Promise.resolve();
  });
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  valueSetter?.call(input, value);
};

const setTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  valueSetter?.call(textarea, value);
};

const findByText = (text: string) =>
  [...document.body.querySelectorAll("*")].find(
    (element) => element.textContent?.trim() === text
  );

const findButtonByText = (text: string) =>
  [...document.body.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === text
  );

const openActionsMenu = async () => {
  const actionsButton = document.body.querySelector(
    'button[aria-label="Acoes para Produto teste"]'
  );

  expect(actionsButton).toBeTruthy();
  await clickElement(actionsButton as HTMLButtonElement);
};

describe("ProductDetailActions", () => {
  afterEach(() => {
    actionMocks.archiveProductAction.mockReset();
    actionMocks.softDeleteProductAction.mockReset();
    actionMocks.writeOffProductStockAction.mockReset();
    routerMocks.push.mockReset();
    routerMocks.refresh.mockReset();
    for (const root of mountedRoots.splice(0)) {
      act(() => {
        root.unmount();
      });
    }
    document.body.innerHTML = "";
  });

  it("blocks stock write-off above current stock with inline feedback", async () => {
    renderComponent();

    await openActionsMenu();
    await clickElement(findByText("Baixa") as Element);

    const quantityInput = document.body.querySelector(
      "#detail-writeoff-quantity"
    ) as HTMLInputElement;

    expect(quantityInput).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      setInputValue(quantityInput, "3");
      quantityInput.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      );
      quantityInput.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });

    expect(
      findByText("A baixa nao pode ser maior que o estoque atual.")
    ).toBeTruthy();
    expect(findButtonByText("Revisar baixa")?.hasAttribute("disabled")).toBe(
      true
    );
    expect(actionMocks.writeOffProductStockAction).not.toHaveBeenCalled();
  });

  it("requires explicit archive confirmation before calling the action", async () => {
    actionMocks.archiveProductAction.mockResolvedValueOnce(undefined);
    renderComponent();

    await openActionsMenu();
    await clickElement(findByText("Arquivar") as Element);

    expect(findByText("Arquivar produto?")).toBeTruthy();
    expect(actionMocks.archiveProductAction).not.toHaveBeenCalled();

    await clickElement(findButtonByText("Confirmar arquivamento") as Element);

    expect(actionMocks.archiveProductAction).toHaveBeenCalledWith("product-1");
  });

  it("requires a reason and confirmation before final product removal", async () => {
    actionMocks.softDeleteProductAction.mockResolvedValueOnce("deleted");
    renderComponent();

    await openActionsMenu();
    await clickElement(findByText("Remover definitivamente") as Element);

    expect(findByText("Remover produto definitivamente?")).toBeTruthy();
    expect(
      findButtonByText("Confirmar remocao definitiva")?.hasAttribute("disabled")
    ).toBe(true);

    const reasonInput = document.body.querySelector(
      "#soft-delete-reason"
    ) as HTMLTextAreaElement;

    await act(async () => {
      setTextareaValue(reasonInput, "Produto descontinuado");
      reasonInput.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      );
      reasonInput.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });

    await clickElement(
      findButtonByText("Confirmar remocao definitiva") as Element
    );

    expect(actionMocks.softDeleteProductAction).toHaveBeenCalledWith(
      "product-1",
      {
        confirmed: true,
        reason: "Produto descontinuado",
      }
    );
  });
});
