"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SUIT_SYMBOLS = ["\u2660", "\u2665", "\u2666", "\u2663"];
const SUIT_COLORS = ["#7C3AED", "#EC4899", "#7C3AED", "#EC4899"];
const PARTICLE_COUNT = 25;

type Particle = {
  id: number;
  symbol: string;
  color: string;
  x: number;
  delay: number;
  rotation: number;
  size: number;
  duration: number;
};

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const suitIndex = Math.floor(Math.random() * SUIT_SYMBOLS.length);
    return {
      id: i,
      symbol: SUIT_SYMBOLS[suitIndex],
      color: SUIT_COLORS[suitIndex],
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360 - 180,
      size: 16 + Math.random() * 20,
      duration: 1.2 + Math.random() * 0.8,
    };
  });
}

type CelebrationProps = {
  visible: boolean;
  pointCost: number;
  onComplete: () => void;
};

export function Celebration({ visible, pointCost, onComplete }: CelebrationProps) {
  const particles = useMemo(() => generateParticles(), []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={(definition) => {
            if (definition === "exit") return;
            setTimeout(onComplete, 2000);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: "rgba(124, 58, 237, 0.85)" }}
        >
          {/* Falling suit particles */}
          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              initial={{
                opacity: 0,
                y: -40,
                x: 0,
                rotate: 0,
                scale: 0.3,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: ["-10vh", "110vh"],
                rotate: particle.rotation,
                scale: [0.3, 1, 1, 0.5],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: "easeIn",
              }}
              className="absolute top-0 pointer-events-none select-none"
              style={{
                left: `${particle.x}%`,
                fontSize: `${particle.size}px`,
                color: particle.color,
                textShadow: "0 0 8px rgba(255,255,255,0.3)",
              }}
              aria-hidden="true"
            >
              {particle.symbol}
            </motion.span>
          ))}

          {/* Central message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.15,
            }}
            className="text-center z-10"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-heading font-extrabold text-4xl text-white mb-3"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
            >
              Card Played!
            </motion.p>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.5,
              }}
              className="font-mono font-bold text-2xl"
              style={{ color: "#EC4899" }}
            >
              -{pointCost} pts
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
