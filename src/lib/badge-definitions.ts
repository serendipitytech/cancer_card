import type { BadgeDefinition } from "@/types";

// The Cancer Card badge catalog. Each entry here is reachable: the award engine
// (badges.ts `evaluateBadges`) can actually grant it from stats the app writes.
//
// Five earlier definitions (Taco Champion, Midnight Hero, Ride or Die, The Floor
// Is Clean, Penny Pincher) were cut for v1: they needed per-category completion
// counts, time-of-day, or min-bid context that the app does not track, and the
// old code never evaluated them, so they could never be earned. Per the engine
// spec (section 6.3) a v1-out-of-scope badge is dropped from the catalog, not
// left dangling. They return when the shared engine tracks those signals.
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_responder",
    name: "First Responder",
    description: "Completed 5 tasks",
    emoji: "🚨",
  },
  {
    id: "auction_shark",
    name: "Auction Shark",
    description: "Won 5+ reverse auctions",
    emoji: "🦈",
  },
  {
    id: "seven_day_streak",
    name: "7-Day Streak",
    description: "Kept a 7-day self-care streak",
    emoji: "🔥",
  },
  {
    id: "the_og",
    name: "The OG",
    description: "One of the first 5 crew members to join",
    emoji: "👑",
  },
];

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
