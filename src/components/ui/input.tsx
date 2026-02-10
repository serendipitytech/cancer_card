"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="relative">
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-medium mb-1.5 transition-colors",
            focused ? "text-royal" : "text-ink",
            error && "text-danger"
          )}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 rounded-button bg-surface border text-ink",
            "placeholder:text-muted",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            error
              ? "border-danger focus:ring-danger"
              : "border-royal-200 focus:border-royal focus:ring-royal",
            className
          )}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
