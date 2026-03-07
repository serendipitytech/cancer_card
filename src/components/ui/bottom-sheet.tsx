"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const SPRING_CONFIG = { type: "spring" as const, damping: 30, stiffness: 300 };

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const sheetY = useMotionValue(typeof window !== "undefined" ? window.innerHeight : 1000);
  const backdropOpacity = useTransform(sheetY, (y: number) => {
    const sheetHeight = sheetRef.current?.offsetHeight ?? window.innerHeight;
    return Math.max(0, Math.min(1, 1 - y / sheetHeight));
  });
  const dragStartRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isAnimatingOut = useRef(false);

  const getSheetHeight = useCallback(() => {
    return sheetRef.current?.offsetHeight ?? window.innerHeight;
  }, []);

  const animateClose = useCallback(() => {
    if (isAnimatingOut.current) return;
    isAnimatingOut.current = true;
    const height = getSheetHeight();
    animate(sheetY, height, SPRING_CONFIG).then(() => {
      isAnimatingOut.current = false;
      onClose();
    });
  }, [sheetY, getSheetHeight, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Start off-screen, then animate in
      sheetY.set(window.innerHeight);
      // Use requestAnimationFrame so the sheet div mounts and we can measure it
      requestAnimationFrame(() => {
        animate(sheetY, 0, SPRING_CONFIG);
      });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, sheetY]);

  function handleHandleDragEnd(
    _: unknown,
    info: { offset: { y: number }; velocity: { y: number } }
  ) {
    if (info.offset.y > 80 || info.velocity.y > 500) {
      animateClose();
    } else {
      animate(sheetY, 0, SPRING_CONFIG);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bottom-sheet-backdrop"
            style={{ opacity: backdropOpacity }}
            className="fixed inset-0 z-50 bg-midnight/40 backdrop-blur-sm"
            onClick={animateClose}
          />
          <motion.div
            key="bottom-sheet-panel"
            ref={sheetRef}
            style={{ y: sheetY }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-surface rounded-t-sheet shadow-sheet",
              "max-h-[85vh] overflow-hidden flex flex-col",
              "safe-bottom",
              className
            )}
          >
            {/* Drag handle — only this area triggers swipe-to-dismiss */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0}
              onDrag={(_, info) => {
                const clamped = Math.max(0, info.offset.y - dragStartRef.current);
                sheetY.set(clamped);
              }}
              onDragStart={(_, info) => {
                dragStartRef.current = info.offset.y;
              }}
              onDragEnd={handleHandleDragEnd}
              className="cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-royal-200" />
              </div>

              {title && (
                <div className="flex items-center justify-between px-5 pb-3">
                  <h2 className="font-heading font-bold text-midnight text-lg">
                    {title}
                  </h2>
                  <button
                    onClick={animateClose}
                    className="p-2 rounded-full hover:bg-royal-50 text-muted min-h-0 min-w-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
