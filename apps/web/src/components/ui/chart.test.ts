import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", async () => {
  const { createElement: createReactElement } = await import("react");

  return {
    Legend: () => createReactElement("div"),
    ResponsiveContainer: ({
      children,
      debounce,
      initialDimension,
    }: {
      children: React.ReactNode;
      debounce?: number;
      initialDimension?: {
        height: number;
        width: number;
      };
    }) =>
      createReactElement(
        "div",
        {
          "data-responsive-debounce": debounce,
          "data-responsive-initial-height": initialDimension?.height,
          "data-responsive-initial-width": initialDimension?.width,
        },
        children
      ),
    Tooltip: () => createReactElement("div"),
  };
});

import { ChartContainer } from "@/components/ui/chart";

describe("ChartContainer", () => {
  it("uses a 16ms resize debounce by default", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ChartContainer,
        {
          config: {},
        },
        createElement("span", null, "chart")
      )
    );

    expect(markup).toContain('data-responsive-debounce="16"');
    expect(markup).toContain('data-responsive-initial-height="200"');
    expect(markup).toContain('data-responsive-initial-width="320"');
  });

  it("allows overriding the responsive resize debounce", () => {
    const markup = renderToStaticMarkup(
      createElement(
        ChartContainer,
        {
          config: {},
          resizeDebounce: 48,
        },
        createElement("span", null, "chart")
      )
    );

    expect(markup).toContain('data-responsive-debounce="48"');
  });
});
