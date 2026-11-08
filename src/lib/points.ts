import { db } from "@/db";
import { activityFeed } from "@/db/schema";

export type ActivityEventType = (typeof activityFeed.eventType.enumValues)[number];

// The old deductPoints/addPoints/getPointBalance helpers were removed: every
// route inlined its own `point_balance ± N` instead of calling them, so they
// were dead. Point writes stay inline for now; the shared engine's ledger API
// (WP10) is where they will finally be centralized.
export function logActivity(
  crewId: string,
  eventType: ActivityEventType,
  actorId: string,
  data: Record<string, unknown>
) {
  db.insert(activityFeed)
    .values({
      crewId,
      eventType,
      actorId,
      data,
    })
    .run();
}
