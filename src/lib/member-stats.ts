import { db } from "@/db";
import { crewMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { MemberStats } from "@/types";
import { evaluateBadges } from "@/lib/badges";

// Centralized per-member stat writes and transactional badge awarding.
//
// Before this module the completion-stat `json_set` block was copy-pasted into
// the complete and close routes, `auction_wins` was never written anywhere, and
// `evaluateBadges`/`awardBadges` had no callers at all. These helpers are the
// single home for "a member did something worth recording", and each runs inside
// the caller's existing transaction so the stat write, the point settlement, and
// the badge award all commit or roll back together.

// The handle every helper accepts: either the base `db` or an open transaction.
// Extracted from the transaction callback's parameter so routes can pass `tx`.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbHandle = typeof db | Tx;

/** Bump tasksCompleted + pointsSpent for the helper credited with a completion. */
export function recordCompletionStats(
  handle: DbHandle,
  crewId: string,
  userId: string,
  pointsSpent: number
): void {
  handle
    .update(crewMembers)
    .set({
      stats: sql`json_set(
        COALESCE(${crewMembers.stats}, '{}'),
        '$.tasksCompleted', COALESCE(json_extract(${crewMembers.stats}, '$.tasksCompleted'), 0) + 1,
        '$.pointsSpent', COALESCE(json_extract(${crewMembers.stats}, '$.pointsSpent'), 0) + ${pointsSpent}
      )`,
    })
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .run();
}

/** Bump auctionWins for the helper who won a reverse auction. */
export function recordAuctionWin(
  handle: DbHandle,
  crewId: string,
  userId: string
): void {
  handle
    .update(crewMembers)
    .set({
      stats: sql`json_set(
        COALESCE(${crewMembers.stats}, '{}'),
        '$.auctionWins', COALESCE(json_extract(${crewMembers.stats}, '$.auctionWins'), 0) + 1
      )`,
    })
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .run();
}

/**
 * Store the card holder's self-care streak. currentStreak is set outright;
 * longestStreak is raised to the high-water mark and never lowered.
 */
export function recordStreak(
  handle: DbHandle,
  crewId: string,
  userId: string,
  currentStreak: number
): void {
  handle
    .update(crewMembers)
    .set({
      stats: sql`json_set(
        COALESCE(${crewMembers.stats}, '{}'),
        '$.currentStreak', ${currentStreak},
        '$.longestStreak', MAX(COALESCE(json_extract(${crewMembers.stats}, '$.longestStreak'), 0), ${currentStreak})
      )`,
    })
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .run();
}

/**
 * Evaluate badges for a member against their current stats and award any newly
 * earned ones, all inside `handle`'s transaction. Returns the newly awarded
 * badge ids so the caller can fire feed/notification side effects AFTER commit
 * (via `emitBadgeNotifications`). Returns [] if the member is gone or earns none.
 */
export function awardEligibleBadges(
  handle: DbHandle,
  crewId: string,
  userId: string
): string[] {
  const member = handle
    .select({ id: crewMembers.id, stats: crewMembers.stats, badges: crewMembers.badges })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .get();

  if (!member) return [];

  const stats = (member.stats || {}) as MemberStats;
  const currentBadges = (member.badges || []) as string[];

  const countRow = handle
    .select({ count: sql<number>`count(*)` })
    .from(crewMembers)
    .where(eq(crewMembers.crewId, crewId))
    .get();
  const memberCount = countRow?.count ?? 0;

  const newBadges = evaluateBadges(stats, currentBadges, memberCount);
  if (newBadges.length === 0) return [];

  handle
    .update(crewMembers)
    .set({ badges: [...currentBadges, ...newBadges] })
    .where(eq(crewMembers.id, member.id))
    .run();

  return newBadges;
}
