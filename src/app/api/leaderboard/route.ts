import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { crewMembers, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getUserCrew } from "@/lib/session";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = getUserCrew(session.user.id);
    if (!crew) {
      return NextResponse.json({ leaderboard: [] });
    }

    const members = db
      .select({
        userId: crewMembers.userId,
        role: crewMembers.role,
        stats: crewMembers.stats,
        badges: crewMembers.badges,
        joinedAt: crewMembers.joinedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(crewMembers)
      .innerJoin(users, eq(crewMembers.userId, users.id))
      .where(eq(crewMembers.crewId, crew.crewId))
      .all();

    const ranked = members
      .filter((m) => m.role !== "card_holder")
      .map((m) => {
        const stats = (m.stats || {}) as Record<string, number>;
        return {
          userId: m.userId,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          role: m.role,
          badges: m.badges || [],
          joinedAt: m.joinedAt,
          tasksCompleted: stats.tasksCompleted || 0,
          pointsSpent: stats.pointsSpent || 0,
          auctionWins: stats.auctionWins || 0,
          currentStreak: stats.currentStreak || 0,
          score:
            (stats.tasksCompleted || 0) * 10 +
            (stats.pointsSpent || 0) +
            (stats.auctionWins || 0) * 15,
        };
      })
      .sort((a, b) => b.score - a.score);

    const cardHolder = members.find((m) => m.role === "card_holder");

    return NextResponse.json({
      leaderboard: ranked,
      cardHolder: cardHolder
        ? {
            userId: cardHolder.userId,
            displayName: cardHolder.displayName,
            avatarUrl: cardHolder.avatarUrl,
          }
        : null,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
