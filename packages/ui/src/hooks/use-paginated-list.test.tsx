// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePaginatedListState } from "./use-paginated-list";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

interface Item {
  id: string;
  label: string;
}

const renderHarness = ({
  initialCursor,
  initialItems,
  loadMore,
  onLoadError = vi.fn(),
  resetKey,
}: {
  initialCursor: string | null;
  initialItems: Item[];
  loadMore: (
    cursor: string
  ) => Promise<{ items: Item[]; nextCursor: string | null }>;
  onLoadError?: (error: unknown) => void;
  resetKey: string;
}) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);

  const Harness = (props: {
    initialCursor: string | null;
    initialItems: Item[];
    resetKey: string;
  }) => {
    const state = usePaginatedListState({
      getItemId: (item) => item.id,
      initialCursor: props.initialCursor,
      initialItems: props.initialItems,
      loadMore,
      onLoadError,
      resetKey: props.resetKey,
    });

    return (
      <div>
        <output data-testid="items">
          {state.items.map((item) => item.label).join(",")}
        </output>
        <output data-testid="loading">{String(state.loadingMore)}</output>
        <output data-testid="cursor">{state.cursor ?? "none"}</output>
        <button onClick={state.loadMoreItems} type="button">
          load
        </button>
      </div>
    );
  };

  act(() => {
    root.render(
      createElement(Harness, {
        initialCursor,
        initialItems,
        resetKey,
      })
    );
  });

  return {
    container,
    rerender: (nextProps: {
      initialCursor: string | null;
      initialItems: Item[];
      resetKey: string;
    }) => {
      act(() => {
        root.render(createElement(Harness, nextProps));
      });
    },
    root,
  };
};

describe("usePaginatedListState", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("merges new server items while updating existing ones", () => {
    const { container, rerender, root } = renderHarness({
      initialCursor: "cursor-1",
      initialItems: [{ id: "1", label: "one" }],
      loadMore: vi.fn(),
      resetKey: "same",
    });

    rerender({
      initialCursor: "cursor-1",
      initialItems: [
        { id: "2", label: "two" },
        { id: "1", label: "one updated" },
      ],
      resetKey: "same",
    });

    expect(container.querySelector('[data-testid="items"]')?.textContent).toBe(
      "two,one updated"
    );

    act(() => {
      root.unmount();
    });
  });

  it("resets list state when the reset key changes", () => {
    const { container, rerender, root } = renderHarness({
      initialCursor: "cursor-1",
      initialItems: [{ id: "1", label: "one" }],
      loadMore: vi.fn(),
      resetKey: "q=one",
    });

    rerender({
      initialCursor: null,
      initialItems: [{ id: "3", label: "three" }],
      resetKey: "q=three",
    });

    expect(container.querySelector('[data-testid="items"]')?.textContent).toBe(
      "three"
    );
    expect(container.querySelector('[data-testid="cursor"]')?.textContent).toBe(
      "none"
    );

    act(() => {
      root.unmount();
    });
  });

  it("appends only unique load-more items and advances the cursor", async () => {
    const loadMore = vi.fn().mockResolvedValueOnce({
      items: [
        { id: "1", label: "one from page" },
        { id: "2", label: "two" },
      ],
      nextCursor: "cursor-2",
    });
    const { container, root } = renderHarness({
      initialCursor: "cursor-1",
      initialItems: [{ id: "1", label: "one" }],
      loadMore,
      resetKey: "same",
    });

    await act(async () => {
      container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(loadMore).toHaveBeenCalledWith("cursor-1");
    expect(container.querySelector('[data-testid="items"]')?.textContent).toBe(
      "one,two"
    );
    expect(container.querySelector('[data-testid="cursor"]')?.textContent).toBe(
      "cursor-2"
    );

    act(() => {
      root.unmount();
    });
  });

  it("does not start overlapping load-more requests", async () => {
    let resolveLoadMore:
      | ((value: { items: Item[]; nextCursor: string | null }) => void)
      | undefined;
    const loadMore = vi.fn(
      () =>
        new Promise<{ items: Item[]; nextCursor: string | null }>((resolve) => {
          resolveLoadMore = resolve;
        })
    );
    const { container, root } = renderHarness({
      initialCursor: "cursor-1",
      initialItems: [{ id: "1", label: "one" }],
      loadMore,
      resetKey: "same",
    });

    await act(async () => {
      const button = container.querySelector("button");
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(loadMore).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveLoadMore?.({
        items: [{ id: "2", label: "two" }],
        nextCursor: null,
      });
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="items"]')?.textContent).toBe(
      "one,two"
    );

    act(() => {
      root.unmount();
    });
  });

  it("reports load-more errors and releases the loading state", async () => {
    const onLoadError = vi.fn();
    const { container, root } = renderHarness({
      initialCursor: "cursor-1",
      initialItems: [{ id: "1", label: "one" }],
      loadMore: vi.fn().mockRejectedValueOnce(new Error("fail")),
      onLoadError,
      resetKey: "same",
    });

    await act(async () => {
      container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onLoadError).toHaveBeenCalledWith(expect.any(Error));
    expect(
      container.querySelector('[data-testid="loading"]')?.textContent
    ).toBe("false");

    act(() => {
      root.unmount();
    });
  });
});
