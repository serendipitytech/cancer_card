import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { milestones, selfCareRoutines, crews, activityFeed, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logMilestoneSchema } from "@/lib/validators";
import {
  calculateStreak,
  alreadyLoggedToday,
  STREAK_ACTION_TYPES,
} from "@/lib/streaks";
import { recordStreak, awardEligibleBadges } from "@/lib/member-stats";
import { emitBadgeNotifications } from "@/lib/badges";
import { notifyOnEvent } from "@/lib/notification-service";
import { getUserActiveCrew } from "@/lib/session";
import { isCardHolder } from "@/lib/roles";
import { resolveTimezone } from "@/lib/time";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { allowed } = checkRateLimit("milestones", userId, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many milestones logged. Please try again later." },
        { status: 429 }
      );
    }

    const crew = await getUserActiveCrew(userId);
    if (!crew || !isCardHolder(crew.role)) {
      return NextResponse.json(
        { error: "Only the Card Holder can log milestones" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = logMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const userRow = db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    const tz = resolveTimezone(userRow?.timezone);

    // Farm guard: the same self-care behavior can be logged at most once per
    // local day, so neither the base points nor the streak bonus can be farmed
    // by logging the same thing twice in a day.
    if (alreadyLoggedToday(userId, crew.crewId, parsed.data.milestoneType, tz)) {
      return NextResponse.json(
        { error: "You've already logged this today. Come back tomorrow!" },
        { status: 409 }
      );
    }

    const routine = db
      .select()
      .from(selfCareRoutines)
      .where(
        and(
          eq(selfCareRoutines.crewId, crew.crewId),
          eq(selfCareRoutines.milestoneType, parsed.data.milestoneType)
        )
      )
      .get();

    const pointValue = routine?.pointValue ?? 10;

    const result = db.transaction((tx) => {
      const milestone = tx
        .insert(milestones)
        .values({
          crewId: crew.crewId,
          userId,
          milestoneType: parsed.data.milestoneType,
          pointsEarned: pointValue,
          note: parsed.data.note || null,
        })
        .returning()
        .get();

      const updatedCrew = tx
        .update(crews)
        .set({
          pointBalance: sql`${crews.pointBalance} + ${pointValue}`,
        })
        .where(eq(crews.id, crew.crewId))
        .returning({ pointBalance: crews.pointBalance })
        .get();

      tx.insert(activityFeed)
        .values({
          crewId: crew.crewId,
          eventType: "milestone_logged",
          actorId: userId,
          data: {
            milestoneType: parsed.data.milestoneType,
            pointsEarned: pointValue,
            routineName: routine?.name,
          },
        })
        .run();

      let streakBonus = 0;
      // Streak-driving action type(s) are product config, not a hardcoded
      // "meds". Compute AFTER inserting this log so today counts, and in the
      // user's local timezone so an evening log does not land on the next day.
      if (STREAK_ACTION_TYPES.includes(parsed.data.milestoneType)) {
        const streak = calculateStreak(userId, crew.crewId, tz);

        recordStreak(tx, crew.crewId, userId, streak.currentStreak);

        if (streak.bonusPoints > 0) {
          streakBonus = streak.bonusPoints;

          tx.update(crews)
            .set({
              pointBalance: sql`${crews.pointBalance} + ${streak.bonusPoints}`,
            })
            .where(eq(crews.id, crew.crewId))
            .run();

          tx.insert(milestones)
            .values({
              crewId: crew.crewId,
              userId,
              milestoneType: "streak_bonus",
              pointsEarned: streak.bonusPoints,
              note: streak.bonusType,
              isStreakBonus: true,
            })
            .run();
        }
      }

      const awardedBadges = awardEligibleBadges(tx, crew.crewId, userId);

      return {
        milestone,
        newBalance: updatedCrew.pointBalance + streakBonus,
        streakBonus,
        awardedBadges,
      };
    });

    notifyOnEvent(crew.crewId, "milestone_logged", userId, {
      milestoneType: parsed.data.milestoneType,
      pointsEarned: pointValue,
      routineName: routine?.name,
      actorName: session.user.name || "Someone",
    });

    emitBadgeNotifications(
      crew.crewId,
      userId,
      result.awardedBadges,
      session.user.name || "Someone"
    );

    return NextResponse.json({
      milestone: result.milestone,
      pointsEarned: pointValue,
      streakBonus: result.streakBonus,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error("Log milestone error:", error);
    return NextResponse.json(
      { error: "Failed to log milestone" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit("milestones:read", session.user.id, {
      windowMs: 60 * 1000,
      maxRequests: 120,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
    }

    const crew = await getUserActiveCrew(session.user.id);
    if (!crew) {
      return NextResponse.json({ milestones: [], routines: [] });
    }

    const recentMilestones = db
      .select()
      .from(milestones)
      .where(eq(milestones.crewId, crew.crewId))
      .orderBy(desc(milestones.loggedAt))
      .limit(50)
      .all();

    const routines = db
      .select()
      .from(selfCareRoutines)
      .where(
        and(
          eq(selfCareRoutines.crewId, crew.crewId),
          eq(selfCareRoutines.isActive, true)
        )
      )
      .all();

    return NextResponse.json({ milestones: recentMilestones, routines });
  } catch (error) {
    console.error("Get milestones error:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}
