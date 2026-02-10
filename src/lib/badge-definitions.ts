import type { BadgeDefinition } from "@/types";

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_responder",
    name: "First Responder",
    description: "First to claim an open task 5 times",
    emoji: "🚨",
  },
  {
    id: "taco_champion",
    name: "Taco Champion",
    description: "Delivered food 10+ times",
    emoji: "🌮",
  },
  {
    id: "midnight_hero",
    name: "Midnight Hero",
    description: "Completed a task between 10pm-6am",
    emoji: "🦸",
  },
  {
    id: "auction_shark",
    name: "Auction Shark",
    description: "Won 5+ reverse auctions",
    emoji: "🦈",
  },
  {
    id: "ride_or_die",
    name: "Ride or Die",
    description: "Completed 5+ transportation tasks",
    emoji: "🚗",
  },
  {
    id: "floor_is_clean",
    name: "The Floor Is Clean",
    description: "Completed 5+ household tasks",
    emoji: "✨",
  },
  {
    id: "seven_day_streak",
    name: "7-Day Streak",
    description: "Helped every day for a week",
    emoji: "🔥",
  },
  {
    id: "the_og",
    name: "The OG",
    description: "One of the first 5 crew members to join",
    emoji: "👑",
  },
  {
    id: "penny_pincher",
    name: "Penny Pincher",
    description: "Won an auction at minimum bid",
    emoji: "💰",
  },
];

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
