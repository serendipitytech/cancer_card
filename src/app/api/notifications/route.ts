import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  getUserNotifications,
  getUnreadCount,
  getNotificationTotal,
} from "@/lib/notification-queries";
import { notificationListQuerySchema } from "@/lib/notification-validators";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit(
      "notif:read",
      session.user.id,
      RATE_LIMITS.read
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
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
        total: 0,
        limit: 20,
        offset: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const parsed = notificationListQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const limit = parsed.data.limit ?? 20;
    const offset = parsed.data.offset ?? 0;
    const status = parsed.data.status;

    const notifications = getUserNotifications(
      session.user.id,
      crew.crewId,
      { limit, offset, status }
    );
    const unreadCount = getUnreadCount(session.user.id, crew.crewId);
    const total = getNotificationTotal(session.user.id, crew.crewId, status);

    return NextResponse.json({
      notifications,
      unreadCount,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
