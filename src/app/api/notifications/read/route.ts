import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  markAllRead,
  markNotificationsRead,
} from "@/lib/notification-queries";
import { markReadSchema } from "@/lib/notification-validators";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit(
      "notif:read:mark",
      session.user.id,
      RATE_LIMITS.write
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const crew = await getUserActiveCrew(session.user.id);
    if (!crew) {
      return NextResponse.json(
        { error: "No active crew found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let markedCount: number;

    if ("all" in parsed.data) {
      markedCount = markAllRead(session.user.id, crew.crewId);
    } else {
      markedCount = markNotificationsRead(session.user.id, crew.crewId, parsed.data.ids);
    }

    return NextResponse.json({ success: true, markedCount });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
