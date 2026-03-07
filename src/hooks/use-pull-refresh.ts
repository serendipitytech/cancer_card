"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { impactLight } from "@/lib/haptics";

const PULL_THRESHOLD = 80;

type PullRefreshOptions = {
  onRefresh: () => Promise<void>;
};

export function usePullRefresh({ onRefresh }: PullRefreshOptions) {
  const pullRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const thresholdCrossedRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      const el = pullRef.current;
      if (!el || el.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
      thresholdCrossedRef.current = false;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pullingRef.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      e.preventDefault();

      const dampened = Math.min(delta * 0.5, PULL_THRESHOLD * 1.5);
      setPullDistance(dampened);

      if (dampened >= PULL_THRESHOLD && !thresholdCrossedRef.current) {
        thresholdCrossedRef.current = true;
        impactLight();
      }
      if (dampened < PULL_THRESHOLD && thresholdCrossedRef.current) {
        thresholdCrossedRef.current = false;
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.5);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = pullRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullRef, pullDistance, isRefreshing };
}
