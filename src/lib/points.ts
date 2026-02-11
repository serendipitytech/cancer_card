import { db } from "@/db";
import { crews, activityFeed } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type ActivityEventType = (typeof activityFeed.eventType.enumValues)[number];

export function deductPoints(crewId: string, amount: number): number {
  const crew = db
    .update(crews)
    .set({
      pointBalance: sql`${crews.pointBalance} - ${amount}`,
    })
    .where(eq(crews.id, crewId))
    .returning({ pointBalance: crews.pointBalance })
    .get();

  return crew.pointBalance;
}

export function addPoints(crewId: string, amount: number): number {
  const crew = db
    .update(crews)
    .set({
      pointBalance: sql`${crews.pointBalance} + ${amount}`,
    })
    .where(eq(crews.id, crewId))
    .returning({ pointBalance: crews.pointBalance })
    .get();

  return crew.pointBalance;
}

export function getPointBalance(crewId: string): number {
  const crew = db
    .select({ pointBalance: crews.pointBalance })
    .from(crews)
    .where(eq(crews.id, crewId))
    .get();

  return crew?.pointBalance ?? 0;
}

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
