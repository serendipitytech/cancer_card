import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars.charAt(b % chars.length)).join("");
}

export function formatPoints(points: number): string {
  if (points >= 0) {
    return `${points.toLocaleString()} pts`;
  }
  return `-${Math.abs(points).toLocaleString()} pts`;
}

export function formatPointsDelta(points: number): string {
  if (points > 0) {
    return `+${points.toLocaleString()}`;
  }
  return points.toLocaleString();
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case "asap":
      return "text-danger";
    case "today":
      return "text-warning";
    default:
      return "text-muted-foreground";
  }
}

export function getUrgencyLabel(urgency: string): string {
  switch (urgency) {
    case "asap":
      return "ASAP please";
    case "today":
      return "Today would be great";
    default:
      return "Whenever";
  }
}

export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    "Food & Drinks": "🍕",
    Transportation: "🚗",
    Household: "🏠",
    Errands: "📦",
    "Company & Comfort": "🤗",
    "Pet Care": "🐶",
    "Kid Care": "👧",
    Wildcard: "🎲",
  };
  return map[category] || "✨";
}
