"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tour-steps";

type TourTooltipProps = {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: { x: number; y: number; width: number; height: number };
  onNext: () => void;
  onSkip: () => void;
};

const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 300;

function computePosition(
  targetRect: TourTooltipProps["targetRect"],
  position: TourStep["position"]
) {
  const centerX = targetRect.x + targetRect.width / 2;
  const left = Math.max(
    16,
    Math.min(centerX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - 16)
  );

  if (position === "below") {
    return { top: targetRect.y + targetRect.height + TOOLTIP_GAP, left };
  }
  return { bottom: window.innerHeight - targetRect.y + TOOLTIP_GAP, left };
}

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onSkip,
}: TourTooltipProps) {
  const positionStyle = useMemo(
    () => computePosition(targetRect, step.position),
    [targetRect, step.position]
  );

  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepIndex}
        className="fixed z-[61]"
        style={{ ...positionStyle, width: TOOLTIP_WIDTH }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Card variant="elevated" padding="md">
          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: totalSteps }, (_, i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-full"
                animate={{
                  width: i === stepIndex ? 20 : 6,
                  backgroundColor:
                    i <= stepIndex
                      ? "var(--color-royal)"
                      : "var(--color-muted)",
                  opacity: i <= stepIndex ? 1 : 0.3,
                }}
                transition={{ duration: 0.2 }}
              />
            ))}
            <span className="ml-auto font-mono text-xs text-muted">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>

          {/* Content */}
          <h3 className="font-heading font-bold text-midnight text-base mb-1">
            {step.title}
          </h3>
          <p className="text-sm text-ink leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-sm text-muted hover:text-ink transition-colors min-h-[44px] px-2"
            >
              Skip tour
            </button>
            <Button size="sm" onClick={onNext} className="min-h-[44px]">
              {isLastStep ? "Got it!" : "Next"}
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
