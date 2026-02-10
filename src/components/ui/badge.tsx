import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "points" | "success" | "warning" | "danger" | "muted";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-royal-100 text-royal-dark",
  points: "bg-gradient-to-r from-royal to-blush text-white font-mono",
  success: "bg-success-light text-emerald-800",
  warning: "bg-warning-light text-amber-800",
  danger: "bg-danger-light text-red-800",
  muted: "bg-slate-100 text-slate-600",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-semibold",
        "whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
