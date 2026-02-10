"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuitIcon } from "./suit-icon";

type PlayCardButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function PlayCardButton({
  onClick,
  disabled,
  className,
}: PlayCardButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative w-full max-w-xs mx-auto",
        "bg-gradient-to-br from-royal via-royal-dark to-blush",
        "rounded-2xl shadow-raised overflow-hidden",
        "flex flex-col items-center justify-center",
        "py-8 px-6",
        "disabled:opacity-50 disabled:pointer-events-none",
        "group",
        className
      )}
    >
      {/* Corner suits */}
      <span className="absolute top-3 left-4 text-white/20 text-sm font-bold">
        <SuitIcon suit="spade" size="sm" className="text-white/20" />
      </span>
      <span className="absolute top-3 right-4 text-white/20 text-sm font-bold">
        <SuitIcon suit="heart" size="sm" className="text-white/20" />
      </span>
      <span className="absolute bottom-3 left-4 text-white/20 text-sm font-bold rotate-180">
        <SuitIcon suit="diamond" size="sm" className="text-white/20" />
      </span>
      <span className="absolute bottom-3 right-4 text-white/20 text-sm font-bold rotate-180">
        <SuitIcon suit="club" size="sm" className="text-white/20" />
      </span>

      {/* Glow effect */}
      <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />

      {/* Icon */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-3"
      >
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center">
          <Zap className="w-8 h-8 text-white" fill="white" />
        </div>
      </motion.div>

      {/* Text */}
      <h2 className="font-heading font-extrabold text-white text-2xl tracking-tight">
        Play My Card
      </h2>
      <p className="text-white/70 text-sm font-medium mt-1">
        Request help from your crew
      </p>
    </motion.button>
  );
}
