"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PointDisplayProps = {
  points: number;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
};

const sizeStyles = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

export function PointDisplay({
  points,
  size = "md",
  showLabel = true,
  className,
}: PointDisplayProps) {
  const [displayPoints, setDisplayPoints] = useState(points);
  const prevPoints = useRef(points);

  useEffect(() => {
    if (prevPoints.current === points) return;

    const start = prevPoints.current;
    const end = points;
    const diff = end - start;
    const duration = Math.min(Math.abs(diff) * 10, 1000);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPoints(Math.round(start + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevPoints.current = points;
  }, [points]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <motion.span
        key={points}
        initial={{ scale: 1 }}
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "font-mono font-bold tabular-nums leading-none",
          sizeStyles[size],
          points >= 0 ? "text-royal" : "text-danger"
        )}
      >
        {displayPoints.toLocaleString()}
      </motion.span>
      {showLabel && (
        <span className="text-xs font-heading font-semibold text-muted uppercase tracking-wider mt-1">
          points
        </span>
      )}
    </div>
  );
}
