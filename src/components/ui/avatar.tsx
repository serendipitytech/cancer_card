import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeStyles = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-royal text-white",
    "bg-blush text-white",
    "bg-success text-white",
    "bg-warning text-white",
    "bg-royal-light text-midnight",
    "bg-blush-light text-midnight",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          sizeStyles[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-heading font-bold flex-shrink-0",
        sizeStyles[size],
        getAvatarColor(name),
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
