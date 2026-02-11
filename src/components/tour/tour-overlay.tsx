"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SpotlightMask } from "./spotlight-mask";
import { TourTooltip } from "./tour-tooltip";
import type { TourStep } from "@/lib/tour-steps";

type TourOverlayProps = {
  isActive: boolean;
  currentStep: TourStep;
  currentStepIndex: number;
  totalSteps: number;
  targetRect: { x: number; y: number; width: number; height: number } | null;
  onNext: () => void;
  onSkip: () => void;
};

export function TourOverlay({
  isActive,
  currentStep,
  currentStepIndex,
  totalSteps,
  targetRect,
  onNext,
  onSkip,
}: TourOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && targetRect && (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onSkip}
        >
          <SpotlightMask targetRect={targetRect} />
          <div onClick={(e) => e.stopPropagation()}>
            <TourTooltip
              step={currentStep}
              stepIndex={currentStepIndex}
              totalSteps={totalSteps}
              targetRect={targetRect}
              onNext={onNext}
              onSkip={onSkip}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
