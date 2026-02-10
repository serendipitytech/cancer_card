import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
};

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer",
        variant === "text" && "h-4 rounded-md",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-card",
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-card p-4 shadow-card space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4" />
          <Skeleton className="w-1/2" />
        </div>
      </div>
      <Skeleton className="w-full h-12" variant="rectangular" />
    </div>
  );
}
