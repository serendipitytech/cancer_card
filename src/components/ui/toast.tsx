"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "points";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  points?: number;
};

type ToastContextType = {
  addToast: (type: ToastType, message: string, points?: number) => void;
};

const ToastContext = createContext<ToastContextType>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-success" />,
  error: <AlertCircle className="w-5 h-5 text-danger" />,
  info: <Info className="w-5 h-5 text-royal" />,
  points: null,
};

const toastStyles: Record<ToastType, string> = {
  success: "border-success/20 bg-success-light",
  error: "border-danger/20 bg-danger-light",
  info: "border-royal/20 bg-royal-50",
  points: "border-royal/30 bg-gradient-to-r from-royal-50 to-blush-50",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, points?: number) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message, points }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ addToast }}>
      {children}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-2 p-4 safe-top pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-card border shadow-raised",
                "w-full max-w-sm pointer-events-auto",
                toastStyles[toast.type]
              )}
            >
              {toast.type === "points" ? (
                <span className="font-mono font-bold text-royal text-lg">
                  +{toast.points}
                </span>
              ) : (
                toastIcons[toast.type]
              )}
              <p className="flex-1 text-sm font-medium text-midnight">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-ink min-h-0 min-w-0 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}
