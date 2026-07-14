// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getProductPricingState,
  ProductPriceMarkupIndicator,
  ProductPriceSuggestionGuide,
} from "@/components/products/product-pricing-fields";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("product pricing fields", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("centralizes suggested price and margin calculations", () => {
    const state = getProductPricingState({
      costPrice: "10",
      currentPrice: "12",
      settings: {
        idealMarkupPercent: 80,
        minimumMarkupPercent: 30,
      },
    });

    expect(state.suggestion.minimumPrice).toBe(13);
    expect(state.suggestion.idealPrice).toBe(18);
    expect(state.suggestion.isBelowMinimum).toBe(true);
    expect(state.currentMarkupPercent).toBeCloseTo(20);
  });

  it("renders shared guide actions and margin feedback", () => {
    const onPriceSelect = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);

    const root: Root = createRoot(container);
    act(() => {
      root.render(
        createElement(
          "div",
          null,
          createElement(ProductPriceSuggestionGuide, {
            costPrice: 10,
            currentPrice: 12,
            onPriceSelect,
            settings: {
              idealMarkupPercent: 80,
              minimumMarkupPercent: 30,
            },
          }),
          createElement(ProductPriceMarkupIndicator, {
            costPrice: 10,
            minimumMarkupPercent: 30,
            price: 12,
          })
        )
      );
    });

    expect(container.textContent).toContain("Guia de preco sugerido");
    expect(container.textContent).toContain("13,00");
    expect(container.textContent).toContain("18,00");
    expect(container.textContent).toContain(
      "Preco abaixo do minimo sugerido. O salvamento continua permitido."
    );
    expect(container.textContent).toContain("20.0%");

    const minimumButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Minimo")
    );

    expect(minimumButton).toBeTruthy();

    act(() => {
      minimumButton?.click();
    });

    expect(onPriceSelect).toHaveBeenCalledWith(13);
  });
});
