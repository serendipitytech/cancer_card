"use client";

import { motion, AnimatePresence } from "framer-motion";

const THRESHOLD = 80;

type PullIndicatorProps = {
  pullDistance: number;
  isRefreshing: boolean;
};

export function PullIndicator({ pullDistance, isRefreshing }: PullIndicatorProps) {
  const visible = pullDistance > 5 || isRefreshing;
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 180;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2 }}
          className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          style={{
            top: Math.max(pullDistance - 36, 4),
            willChange: "transform",
          }}
        >
          <div className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center">
            {isRefreshing ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="#7C3AED"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="#7C3AED"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 transition-transform duration-100"
                style={{ transform: `rotate(${rotation}deg)` }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="#7C3AED"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
