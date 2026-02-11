import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { milestones, selfCareRoutines } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { logMilestoneSchema } from "@/lib/validators";
import { addPoints, logActivity } from "@/lib/points";
import { calculateMedicationStreak } from "@/lib/streaks";
import { getUserCrew } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserCrew(session.user.id);
    if (!crew || crew.role !== "card_holder") {
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

    const milestone = db
      .insert(milestones)
      .values({
        crewId: crew.crewId,
        userId: session.user.id,
        milestoneType: parsed.data.milestoneType,
        pointsEarned: pointValue,
        note: parsed.data.note || null,
      })
      .returning()
      .get();

    const newBalance = addPoints(crew.crewId, pointValue);

    logActivity(crew.crewId, "milestone_logged", session.user.id, {
      milestoneType: parsed.data.milestoneType,
      pointsEarned: pointValue,
      routineName: routine?.name,
    });

    let streakBonus = 0;
    if (parsed.data.milestoneType === "meds") {
      const streak = calculateMedicationStreak(session.user.id, crew.crewId);
      if (streak.bonusPoints > 0) {
        streakBonus = streak.bonusPoints;
        addPoints(crew.crewId, streak.bonusPoints);

        db.insert(milestones)
          .values({
            crewId: crew.crewId,
            userId: session.user.id,
            milestoneType: "streak_bonus",
            pointsEarned: streak.bonusPoints,
            note: streak.bonusType,
            isStreakBonus: true,
          })
          .run();
      }
    }

    return NextResponse.json({
      milestone,
      pointsEarned: pointValue,
      streakBonus,
      newBalance: newBalance + streakBonus,
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

    const crew = await getUserCrew(session.user.id);
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
