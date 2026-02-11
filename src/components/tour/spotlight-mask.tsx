"use client";

import { motion } from "framer-motion";

type SpotlightMaskProps = {
  targetRect: { x: number; y: number; width: number; height: number };
};

const springTransition = { type: "spring" as const, stiffness: 300, damping: 30 };

export function SpotlightMask({ targetRect }: SpotlightMaskProps) {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 60 }}
    >
      <defs>
        <mask id="tour-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <motion.rect
            fill="black"
            rx={16}
            ry={16}
            initial={targetRect}
            animate={targetRect}
            transition={springTransition}
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(30, 27, 75, 0.6)"
        mask="url(#tour-spotlight-mask)"
      />
    </svg>
  );
}
