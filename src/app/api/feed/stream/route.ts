import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activityFeed, users } from "@/db/schema";
import { eq, desc, gt } from "drizzle-orm";
import { getUserCrew } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const crew = getUserCrew(session.user.id);
  if (!crew) {
    return new Response("No crew found", { status: 404 });
  }

  let lastChecked = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      sendEvent({ type: "connected", crewId: crew.crewId });

      const interval = setInterval(() => {
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
              eq(activityFeed.crewId, crew.crewId)
            )
            .orderBy(desc(activityFeed.createdAt))
            .limit(5)
            .all();

          const fresh = newEntries.filter(
            (entry) => entry.createdAt > lastChecked
          );

          if (fresh.length > 0) {
            sendEvent({ type: "updates", entries: fresh });
            lastChecked = new Date();
          }

          sendEvent({ type: "heartbeat" });
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 2000);

      const cleanup = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Note: AbortSignal handling is done by the runtime
      setTimeout(cleanup, 5 * 60 * 1000);
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
