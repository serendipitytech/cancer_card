import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activityFeed, users } from "@/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { getUserActiveCrew } from "@/lib/session";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { allowed, resetAt } = checkRateLimit("feed:stream", session.user.id, RATE_LIMITS.stream);
  if (!allowed) {
    return new Response("Too many connections", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
    });
  }

  const crew = await getUserActiveCrew(session.user.id);
  if (!crew) {
    return new Response("No crew found", { status: 404 });
  }

  let lastChecked = new Date();
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ type: "connected" });

      interval = setInterval(() => {
        try {
          const newEntries = db
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
            .where(
              and(
                eq(activityFeed.crewId, crew.crewId),
                gte(activityFeed.createdAt, lastChecked)
              )
            )
            .orderBy(desc(activityFeed.createdAt))
            .limit(5)
            .all();

          if (newEntries.length > 0) {
            sendEvent({ type: "updates", entries: newEntries });
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
