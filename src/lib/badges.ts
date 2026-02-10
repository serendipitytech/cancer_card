import type { MemberStats } from "@/types";
import { db } from "@/db";
import { crewMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
export { BADGE_DEFINITIONS, getBadgeDefinition } from "./badge-definitions";

export function evaluateBadges(
  userId: string,
  crewId: string,
  stats: MemberStats,
  currentBadges: string[]
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

  if (!currentBadges.includes("the_og")) {
    const memberCount = db
      .select({ count: sql<number>`count(*)` })
      .from(crewMembers)
      .where(eq(crewMembers.crewId, crewId))
      .get();

    const member = db
      .select()
      .from(crewMembers)
      .where(
        and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId))
      )
      .get();

    if (memberCount && memberCount.count <= 5 && member) {
      newBadges.push("the_og");
    }
  }

  return newBadges;
}

export function awardBadges(userId: string, crewId: string, badgeIds: string[]) {
  if (badgeIds.length === 0) return;

  const member = db
    .select()
    .from(crewMembers)
    .where(
      and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId))
    )
    .get();

  if (!member) return;

  const existingBadges = (member.badges || []) as string[];
  const updatedBadges = [...existingBadges, ...badgeIds];

  db.update(crewMembers)
    .set({ badges: updatedBadges })
    .where(eq(crewMembers.id, member.id))
    .run();
}
