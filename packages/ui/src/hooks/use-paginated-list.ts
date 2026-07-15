"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PaginatedListResult<TItem> {
  items: TItem[];
  nextCursor: string | null;
}

export interface PaginatedListStateInput<TItem> {
  getItemId: (item: TItem) => string;
  initialCursor: string | null;
  initialItems: TItem[];
  loadMore: (cursor: string) => Promise<PaginatedListResult<TItem>>;
  onLoadError: (error: unknown) => void;
  resetKey: string;
}

export const usePaginatedListState = <TItem>({
  getItemId,
  initialCursor,
  initialItems,
  loadMore,
  onLoadError,
  resetKey,
}: PaginatedListStateInput<TItem>) => {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const cursorRef = useRef(initialCursor);
  const getItemIdRef = useRef(getItemId);
  const loadingMoreRef = useRef(false);
  const resetVersionRef = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const previousResetKeyRef = useRef(resetKey);

  getItemIdRef.current = getItemId;

  useEffect(() => {
    if (previousResetKeyRef.current !== resetKey) {
      resetVersionRef.current += 1;
      loadingMoreRef.current = false;
      setItems(initialItems);
      setCursor(initialCursor);
      cursorRef.current = initialCursor;
      setLoadingMore(false);
      previousResetKeyRef.current = resetKey;
      return;
    }

    setItems((current) => {
      const getCurrentItemId = getItemIdRef.current;
      const currentIds = new Set(current.map(getCurrentItemId));
      const newItems = initialItems.filter(
        (item) => !currentIds.has(getCurrentItemId(item))
      );
      const serverMap = new Map(
        initialItems.map((item) => [getCurrentItemId(item), item])
      );

      const updatedCurrent = current.map(
        (item) => serverMap.get(getCurrentItemId(item)) ?? item
      );
      return [...newItems, ...updatedCurrent];
    });
  }, [initialCursor, initialItems, resetKey]);

  const loadMoreItems = useCallback(async () => {
    const currentCursor = cursorRef.current;

    if (!currentCursor || loadingMoreRef.current) {
      return;
    }

    const requestVersion = resetVersionRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await loadMore(currentCursor);

      if (requestVersion !== resetVersionRef.current) {
        return;
      }

      setItems((current) => {
        const getCurrentItemId = getItemIdRef.current;
        const existingIds = new Set(current.map(getCurrentItemId));
        const uniqueNewItems = result.items.filter(
          (item) => !existingIds.has(getCurrentItemId(item))
        );
        return [...current, ...uniqueNewItems];
      });
      setCursor(result.nextCursor);
      cursorRef.current = result.nextCursor;
    } catch (error) {
      onLoadError(error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loadMore, onLoadError]);

  return {
    cursor,
    items,
    loadingMore,
    loadMoreItems,
    setItems,
  };
};
