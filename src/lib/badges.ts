import type { MemberStats } from "@/types";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
export { BADGE_DEFINITIONS, getBadgeDefinition } from "./badge-definitions";
import { getBadgeDefinition } from "./badge-definitions";

// Badge evaluation is a PURE function of the member's stats, their current
// badges, and the crew size. Keeping it pure is what makes it testable and what
// lets the award path run inside the same transaction as the stat write (see
// member-stats.ts). The catalog it draws from (badge-definitions.ts) is the
// product-supplied content; this function owns the generic threshold rules.
//
// Only the four stat-backed badges are evaluated here. The five context-only
// badges (per-category counts, time-of-day, min-bid) that the old code defined
// but never evaluated were dropped from the catalog for v1 rather than left
// dangling and unearnable (see WP5 notes / engine spec section 6.3).
export function evaluateBadges(
  stats: MemberStats,
  currentBadges: string[],
  memberCount: number
): string[] {
  const newBadges: string[] = [];

  if (!currentBadges.includes("first_responder") && stats.tasksCompleted >= 5) {
    newBadges.push("first_responder");
  }

  if (!currentBadges.includes("auction_shark") && stats.auctionWins >= 5) {
    newBadges.push("auction_shark");
  }

  if (!currentBadges.includes("seven_day_streak") && stats.longestStreak >= 7) {
    newBadges.push("seven_day_streak");
  }

  if (!currentBadges.includes("the_og") && memberCount <= 5) {
    newBadges.push("the_og");
  }

  return newBadges;
}

/**
 * Fire the activity-feed entry and notification for each newly awarded badge.
 * This is the side-effecting half, split out from evaluation so it runs AFTER
 * the DB transaction commits (notifications must never be inside a tx). The
 * badge rows themselves are written transactionally by `awardEligibleBadges`.
 */
export function emitBadgeNotifications(
  crewId: string,
  userId: string,
  badgeIds: string[],
  actorName: string
): void {
  for (const badgeId of badgeIds) {
    const badge = getBadgeDefinition(badgeId);
    logActivity(crewId, "badge_earned", userId, {
      badgeId,
      badgeName: badge?.name || badgeId,
      badgeEmoji: badge?.emoji || "🎖️",
    });

    notifyOnEvent(crewId, "badge_earned", userId, {
      userId,
      badgeId,
      badgeName: badge?.name || badgeId,
      badgeEmoji: badge?.emoji || "🎖️",
      actorName,
    });
  }
}
