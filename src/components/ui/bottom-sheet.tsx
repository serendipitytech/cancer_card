"use client";

import { useEffect, useRef } from "react";
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

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  const sheetY = useMotionValue(0);
  const backdropOpacity = useTransform(sheetY, [0, 300], [1, 0]);
  const dragStartRef = useRef(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      sheetY.set(0);
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
      onClose();
    } else {
      animate(sheetY, 0, { type: "spring", damping: 30, stiffness: 300 });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ opacity: backdropOpacity }}
            className="fixed inset-0 z-50 bg-midnight/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
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
                    onClick={onClose}
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
