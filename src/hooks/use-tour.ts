"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DASHBOARD_TOUR_STEPS } from "@/lib/tour-steps";

type TargetRect = { x: number; y: number; width: number; height: number };

const SPOTLIGHT_PADDING = 8;
const TOUR_AUTO_START_DELAY_MS = 1200;
const SCROLL_SETTLE_DELAY_MS = 400;

function measureElement(selector: string): TargetRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.x - SPOTLIGHT_PADDING,
    y: rect.y - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };
}

function scrollIntoViewIfNeeded(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function countVisibleSteps(): number {
  return DASHBOARD_TOUR_STEPS.filter(
    (step) => document.querySelector(step.target) !== null
  ).length;
}

export function useTour(hasSeenTour: boolean) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const completedRef = useRef(false);
  const mountedRef = useRef(true);

  const currentStep = DASHBOARD_TOUR_STEPS[currentStepIndex];

  // Cleanup mounted ref on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      document.body.style.overflow = "";
    };
  }, []);

  const measureTarget = useCallback(
    async (stepIndex: number) => {
      const step = DASHBOARD_TOUR_STEPS[stepIndex];
      if (!step) return false;

      scrollIntoViewIfNeeded(step.target);
      await new Promise((r) => setTimeout(r, SCROLL_SETTLE_DELAY_MS));

      if (!mountedRef.current) return false;

      const rect = measureElement(step.target);
      if (!rect) return false;

      setTargetRect(rect);
      return true;
    },
    []
  );

  const findNextValidStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex; i < DASHBOARD_TOUR_STEPS.length; i++) {
        const el = document.querySelector(DASHBOARD_TOUR_STEPS[i].target);
        if (el) return i;
      }
      return null;
    },
    []
  );

  const completeTour = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsActive(false);
    setTargetRect(null);
    document.body.style.overflow = "";

    fetch("/api/user/tour", { method: "PATCH" }).catch(() => {
      /* fire-and-forget */
    });
  }, []);

  const start = useCallback(async () => {
    const firstValid = findNextValidStep(0);
    if (firstValid === null) return;

    setVisibleStepCount(countVisibleSteps());
    document.body.style.overflow = "hidden";
    setCurrentStepIndex(firstValid);
    setIsActive(true);
    await measureTarget(firstValid);
  }, [findNextValidStep, measureTarget]);

  const next = useCallback(async () => {
    const nextValid = findNextValidStep(currentStepIndex + 1);
    if (nextValid === null) {
      completeTour();
      return;
    }
    setCurrentStepIndex(nextValid);
    await measureTarget(nextValid);
  }, [currentStepIndex, findNextValidStep, measureTarget, completeTour]);

  const skip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Auto-start tour after mount delay
  useEffect(() => {
    if (hasSeenTour || completedRef.current) return;

    const timer = setTimeout(() => {
      start();
    }, TOUR_AUTO_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [hasSeenTour, start]);

  // Recalculate on resize
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const target = currentStep.target;
    const handleResize = () => {
      const rect = measureElement(target);
      if (rect) setTargetRect(rect);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isActive, currentStep]);

  return {
    isActive,
    currentStepIndex,
    currentStep,
    targetRect,
    totalSteps: visibleStepCount,
    next,
    skip,
  };
}
