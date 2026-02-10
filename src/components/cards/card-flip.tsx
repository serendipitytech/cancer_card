"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SuitIcon } from "./suit-icon";

type CardFlipProps = {
  front: React.ReactNode;
  back?: React.ReactNode;
  autoFlip?: boolean;
  delay?: number;
  className?: string;
  onFlipComplete?: () => void;
};

export function CardFlip({
  front,
  back,
  autoFlip = false,
  delay = 0,
  className,
  onFlipComplete,
}: CardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(autoFlip);

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true);
      onFlipComplete?.();
    }
  };

  return (
    <div
      className={cn("perspective-[1000px] cursor-pointer", className)}
      onClick={handleFlip}
    >
      <motion.div
        initial={autoFlip ? { rotateY: 180 } : { rotateY: 0 }}
        animate={{ rotateY: isFlipped ? 0 : 180 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.23, 1, 0.32, 1],
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full h-full"
      >
        {/* Front (visible when flipped) */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>

        {/* Back (visible by default) */}
        <div
          className="absolute inset-0 backface-hidden"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back || (
            <div className="w-full h-full bg-gradient-to-br from-royal to-blush rounded-card flex items-center justify-center shadow-raised">
              <div className="grid grid-cols-2 gap-2 opacity-30">
                <SuitIcon suit="spade" size="xl" className="text-white" />
                <SuitIcon suit="heart" size="xl" className="text-white" />
                <SuitIcon suit="diamond" size="xl" className="text-white" />
                <SuitIcon suit="club" size="xl" className="text-white" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
