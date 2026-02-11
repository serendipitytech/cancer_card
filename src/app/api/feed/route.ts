import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activityFeed, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserCrew } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserCrew(session.user.id);
    if (!crew) {
      return NextResponse.json({ feed: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const offset = parseInt(searchParams.get("offset") || "0");

    const feedEntries = db
      .select({
        id: activityFeed.id,
        eventType: activityFeed.eventType,
        data: activityFeed.data,
        createdAt: activityFeed.createdAt,
        actorId: activityFeed.actorId,
        actorName: users.displayName,
        actorAvatar: users.avatarUrl,
      })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.actorId, users.id))
      .where(eq(activityFeed.crewId, crew.crewId))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({ feed: feedEntries });
  } catch (error) {
    console.error("Get feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}
