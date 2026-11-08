import { db } from "./test-db";
import {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
  milestones,
} from "@/db/schema";

let seq = 0;
function uniq(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 8)}`;
}

export type SeededUser = { id: string; displayName: string; email: string };

export function createUser(
  overrides: Partial<{ displayName: string; email: string }> = {}
): SeededUser {
  const displayName = overrides.displayName ?? uniq("User");
  const email = (overrides.email ?? `${uniq("user")}@example.test`).toLowerCase();
  const row = db
    .insert(users)
    .values({ displayName, email })
    .returning()
    .get();
  return { id: row.id, displayName: row.displayName, email: row.email };
}

export type SeededCrew = { id: string; cardHolderId: string; inviteCode: string };

export function createCrew(
  cardHolderId: string,
  overrides: Partial<{ name: string; inviteCode: string }> = {}
): SeededCrew {
  const inviteCode =
    overrides.inviteCode ?? uniq("inv").slice(0, 8).padEnd(8, "0");
  const crew = db
    .insert(crews)
    .values({
      name: overrides.name ?? uniq("Crew"),
      cardHolderId,
      inviteCode,
    })
    .returning()
    .get();

  db.insert(crewMembers)
    .values({ crewId: crew.id, userId: cardHolderId, role: "card_holder" })
    .run();

  return { id: crew.id, cardHolderId, inviteCode: crew.inviteCode };
}

export function addMember(
  crewId: string,
  userId: string,
  role: "card_holder" | "admin" | "crew_member" = "crew_member"
): void {
  db.insert(crewMembers).values({ crewId, userId, role }).run();
}

export function createTask(
  crewId: string,
  createdBy: string,
  overrides: Partial<{ title: string; description: string }> = {}
) {
  return db
    .insert(tasks)
    .values({
      crewId,
      createdBy,
      title: overrides.title ?? uniq("Task"),
      description: overrides.description ?? null,
      category: "general",
      pointCost: 50,
      requestMode: "open",
    })
    .returning()
    .get();
}

export function createBid(
  taskId: string,
  userId: string,
  bidAmount: number,
  comment?: string
) {
  return db
    .insert(bids)
    .values({ taskId, userId, bidAmount, comment: comment ?? null })
    .returning()
    .get();
}

export function createMilestone(
  crewId: string,
  userId: string,
  milestoneType: string,
  note?: string
) {
  return db
    .insert(milestones)
    .values({ crewId, userId, milestoneType, pointsEarned: 10, note: note ?? null })
    .returning()
    .get();
}

export { db };
