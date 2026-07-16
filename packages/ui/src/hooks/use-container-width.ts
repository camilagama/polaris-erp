"use client";

import { startTransition, useEffect, useRef, useState } from "react";

export const getNextRoundedContainerWidth = (
  previousWidth: number | null,
  measuredWidth: number
) => {
  if (!Number.isFinite(measuredWidth)) {
    return null;
  }

  const roundedWidth = Math.round(measuredWidth);

  return previousWidth === roundedWidth ? null : roundedWidth;
};

export function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);
  const committedWidthRef = useRef<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const flushWidth = () => {
      animationFrameIdRef.current = null;
      const measuredWidth = pendingWidthRef.current;
      pendingWidthRef.current = null;

      if (measuredWidth === null) {
        return;
      }

      const nextWidth = getNextRoundedContainerWidth(
        committedWidthRef.current,
        measuredWidth
      );

      if (nextWidth === null) {
        return;
      }

      committedWidthRef.current = nextWidth;
      startTransition(() => {
        setContainerWidth(nextWidth);
      });
    };

    const scheduleWidthUpdate = (measuredWidth: number) => {
      pendingWidthRef.current = measuredWidth;

      if (animationFrameIdRef.current !== null) {
        return;
      }

      animationFrameIdRef.current = window.requestAnimationFrame(flushWidth);
    };

    scheduleWidthUpdate(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      scheduleWidthUpdate(entry.contentRect.width);
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
      pendingWidthRef.current = null;

      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, []);

  return { containerRef, containerWidth };
}
