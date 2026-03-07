import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activityFeed, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserActiveCrew } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit("feed:read", session.user.id, {
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
      return NextResponse.json({ feed: [] });
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || "30");
    const rawOffset = parseInt(searchParams.get("offset") || "0");
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 30, 1), 100);
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

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
