import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notificationLog } from "@/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { getUserActiveCrew } from "@/lib/session";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getUnreadCount } from "@/lib/notification-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { allowed, resetAt } = checkRateLimit(
    "notif:stream",
    session.user.id,
    RATE_LIMITS.stream
  );
  if (!allowed) {
    return new Response("Too many connections", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    });
  }

  const crew = await getUserActiveCrew(session.user.id);
  if (!crew) {
    return new Response("No crew found", { status: 404 });
  }

  const userId = session.user.id;
  const crewId = crew.crewId;
  let lastChecked = new Date();
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const unreadCount = getUnreadCount(userId, crewId);
      sendEvent({ type: "connected", unreadCount });

      interval = setInterval(() => {
        try {
          const newEntries = db
            .select({
              id: notificationLog.id,
              eventType: notificationLog.eventType,
              channel: notificationLog.channel,
              title: notificationLog.title,
              body: notificationLog.body,
              data: notificationLog.data,
              status: notificationLog.status,
              createdAt: notificationLog.createdAt,
            })
            .from(notificationLog)
            .where(
              and(
                eq(notificationLog.userId, userId),
                eq(notificationLog.crewId, crewId),
                eq(notificationLog.channel, "in_app"),
                gte(notificationLog.createdAt, lastChecked)
              )
            )
            .orderBy(desc(notificationLog.createdAt))
            .limit(5)
            .all();

          if (newEntries.length > 0) {
            for (const entry of newEntries) {
              sendEvent({ type: "notification", entry });
            }
            const maxCreatedAt = newEntries.reduce(
              (max, e) => (e.createdAt > max ? e.createdAt : max),
              lastChecked
            );
            lastChecked = new Date(maxCreatedAt.getTime() + 1);
          }

          sendEvent({ type: "heartbeat" });
        } catch {
          if (interval) clearInterval(interval);
          controller.close();
        }
      }, 2000);

      setTimeout(() => {
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 5 * 60 * 1000);
    },
    cancel() {
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
