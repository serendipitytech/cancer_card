import { cn } from "@/lib/utils";

type Suit = "spade" | "heart" | "diamond" | "club";

type SuitIconProps = {
  suit: Suit;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const suitChars: Record<Suit, string> = {
  spade: "\u2660",
  heart: "\u2665",
  diamond: "\u2666",
  club: "\u2663",
};

const suitColors: Record<Suit, string> = {
  spade: "text-spade",
  heart: "text-heart",
  diamond: "text-diamond",
  club: "text-club",
};

const sizeStyles = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

export function SuitIcon({ suit, size = "md", className }: SuitIconProps) {
  return (
    <span
      className={cn(
        "select-none leading-none",
        suitColors[suit],
        sizeStyles[size],
        className
      )}
      aria-hidden="true"
    >
      {suitChars[suit]}
    </span>
  );
}

export function RandomSuit({
  size = "md",
  className,
}: Omit<SuitIconProps, "suit">) {
  const suits: Suit[] = ["spade", "heart", "diamond", "club"];
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  return <SuitIcon suit={randomSuit} size={size} className={className} />;
}
