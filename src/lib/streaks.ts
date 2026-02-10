import { db } from "@/db";
import { milestones } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

type StreakResult = {
  currentStreak: number;
  bonusPoints: number;
  bonusType: string | null;
};

export function calculateMedicationStreak(
  userId: string,
  crewId: string
): StreakResult {
  const recentMilestones = db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, userId),
        eq(milestones.crewId, crewId),
        eq(milestones.milestoneType, "meds")
      )
    )
    .orderBy(desc(milestones.loggedAt))
    .limit(30)
    .all();

  if (recentMilestones.length === 0) {
    return { currentStreak: 0, bonusPoints: 0, bonusType: null };
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dayStart = checkDate.getTime() / 1000;
    const dayEnd = dayStart + 86400;

    const hasLog = recentMilestones.some((m) => {
      const logTime = m.loggedAt.getTime() / 1000;
      return logTime >= dayStart && logTime < dayEnd;
    });

    if (hasLog) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  let bonusPoints = 0;
  let bonusType: string | null = null;

  if (streak === 3) {
    bonusPoints = 50;
    bonusType = "3-day medication streak";
  } else if (streak === 7) {
    bonusPoints = 150;
    bonusType = "7-day medication streak";
  } else if (streak > 7 && streak % 7 === 0) {
    bonusPoints = 150;
    bonusType = `${streak}-day medication streak`;
  }

  return { currentStreak: streak, bonusPoints, bonusType };
}

export function calculateGeneralStreak(
  userId: string,
  crewId: string
): number {
  const recentMilestones = db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.userId, userId),
        eq(milestones.crewId, crewId)
      )
    )
    .orderBy(desc(milestones.loggedAt))
    .limit(60)
    .all();

  if (recentMilestones.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dayStart = checkDate.getTime() / 1000;
    const dayEnd = dayStart + 86400;

    const hasLog = recentMilestones.some((m) => {
      const logTime = m.loggedAt.getTime() / 1000;
      return logTime >= dayStart && logTime < dayEnd;
    });

    if (hasLog) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}
