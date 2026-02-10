import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "accent" | "champagne";
  padding?: "none" | "sm" | "md" | "lg";
};

const variantStyles = {
  default: "bg-surface shadow-card",
  elevated: "bg-surface-raised shadow-raised",
  accent: "bg-royal-50 border border-royal-200 shadow-card",
  champagne: "bg-champagne shadow-card",
};

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  className,
  variant = "default",
  padding = "md",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card transition-shadow duration-200",
        variantStyles[variant],
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 mb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-heading font-bold text-midnight text-lg", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
