"use client";

import { useCallback } from "react";

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

const patterns: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 20],
  error: [30, 50, 30, 50, 30],
};

export function useHaptics() {
  const vibrate = useCallback((pattern: HapticPattern = "light") => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(patterns[pattern]);
    }
  }, []);

  return { vibrate };
}
