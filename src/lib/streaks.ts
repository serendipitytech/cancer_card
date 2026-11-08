import { db } from "@/db";
import { milestones } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { localDay, previousDay } from "@/lib/time";

// Which self-care action(s) drive the streak. This is product config, not a
// hardcoded "meds": Cancer Card points the streak at medication adherence, a
// future product would point it at whatever recurring behavior it reinforces.
// Set to the list of milestone types that count toward the streak.
export const STREAK_ACTION_TYPES: readonly string[] = ["meds"];

// How many days back to consider. A streak longer than this is capped, which is
// fine: the bonuses recur every 7 days regardless.
const STREAK_WINDOW_DAYS = 60;

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  bonusPoints: number;
  bonusType: string | null;
};

/**
 * Count the consecutive-day streak ending today (in the user's timezone) for the
 * streak-driving action type(s), and resolve any streak bonus owed.
 *
 * Day boundaries are the user's LOCAL days (via `localDay`), not server UTC, so
 * a log at 11pm local does not land on the "next" UTC day and break the run.
 * Missing *today* is tolerated (the streak counts up to yesterday); a gap before
 * that ends it, preserving the original behavior.
 */
export function calculateStreak(
  userId: string,
  crewId: string,
  tz: string,
  actionTypes: readonly string[] = STREAK_ACTION_TYPES,
  now: Date = new Date()
): StreakResult {
  const recent = db
    .select({ loggedAt: milestones.loggedAt })
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, userId),
        eq(milestones.crewId, crewId),
        inArray(milestones.milestoneType, [...actionTypes])
      )
    )
    .orderBy(desc(milestones.loggedAt))
    .limit(STREAK_WINDOW_DAYS * 4)
    .all();

  if (recent.length === 0) {
    return { currentStreak: 0, longestStreak: 0, bonusPoints: 0, bonusType: null };
  }

  const loggedDays = new Set(recent.map((m) => localDay(m.loggedAt, tz)));

  let streak = 0;
  let cursor = localDay(now, tz);
  for (let i = 0; i < STREAK_WINDOW_DAYS; i++) {
    if (loggedDays.has(cursor)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    cursor = previousDay(cursor);
  }

  let bonusPoints = 0;
  let bonusType: string | null = null;
  if (streak === 3) {
    bonusPoints = 50;
    bonusType = "3-day streak";
  } else if (streak === 7) {
    bonusPoints = 150;
    bonusType = "7-day streak";
  } else if (streak > 7 && streak % 7 === 0) {
    bonusPoints = 150;
    bonusType = `${streak}-day streak`;
  }

  return { currentStreak: streak, longestStreak: streak, bonusPoints, bonusType };
}

/**
 * Server-side farm guard: has this user already logged `actionType` today, in
 * their local timezone? A second same-day log of the same behavior must be
 * rejected so the base points and the streak bonus cannot be farmed by logging
 * the same thing twice in one day.
 */
export function alreadyLoggedToday(
  userId: string,
  crewId: string,
  actionType: string,
  tz: string,
  now: Date = new Date()
): boolean {
  const today = localDay(now, tz);
  const rows = db
    .select({ loggedAt: milestones.loggedAt })
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, userId),
        eq(milestones.crewId, crewId),
        eq(milestones.milestoneType, actionType)
      )
    )
    .orderBy(desc(milestones.loggedAt))
    .limit(40)
    .all();

  return rows.some((r) => localDay(r.loggedAt, tz) === today);
}
