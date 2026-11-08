import { randomUUID } from "crypto";
import { db, sqlite } from "@/db";
import {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
} from "@/db/schema";
import type { AuctionSettings } from "@/db/schema";

// Wipe every row between tests so each case starts from a known state.
export function resetDb(): void {
  sqlite.exec(`
    DELETE FROM bids;
    DELETE FROM tasks;
    DELETE FROM crew_members;
    DELETE FROM crews;
    DELETE FROM users;
  `);
}

export function makeUser(displayName = "User"): string {
  const id = randomUUID();
  db.insert(users)
    .values({
      id,
      displayName,
      email: `${id}@example.test`,
      passwordHash: "x",
    })
    .run();
  return id;
}

type Role = "card_holder" | "admin" | "crew_member";

export function makeCrew(cardHolderId: string, pointBalance = 500): string {
  const id = randomUUID();
  db.insert(crews)
    .values({
      id,
      name: "Test Crew",
      cardHolderId,
      pointBalance,
      inviteCode: randomUUID().slice(0, 8),
    })
    .run();
  return id;
}

export function addMember(crewId: string, userId: string, role: Role): void {
  db.insert(crewMembers).values({ crewId, userId, role }).run();
}

type TaskOverrides = {
  requestMode?: "direct" | "open" | "auction";
  status?: "pending" | "claimed" | "in_progress" | "completed" | "cancelled";
  assignedTo?: string | null;
  claimedBy?: string | null;
  pointCost?: number;
  finalPointCost?: number | null;
  auctionSettings?: AuctionSettings | null;
};

export function makeTask(
  crewId: string,
  createdBy: string,
  overrides: TaskOverrides = {}
): string {
  const id = randomUUID();
  db.insert(tasks)
    .values({
      id,
      crewId,
      createdBy,
      title: "Drive to appointment",
      category: "transport",
      pointCost: overrides.pointCost ?? 50,
      requestMode: overrides.requestMode ?? "open",
      status: overrides.status ?? "pending",
      assignedTo: overrides.assignedTo ?? null,
      claimedBy: overrides.claimedBy ?? null,
      finalPointCost: overrides.finalPointCost ?? null,
      auctionSettings: overrides.auctionSettings ?? null,
    })
    .run();
  return id;
}

export function makeBid(taskId: string, userId: string, bidAmount: number): string {
  const id = randomUUID();
  db.insert(bids).values({ id, taskId, userId, bidAmount }).run();
  return id;
}

// Build a route-handler params arg (Next.js passes params as a Promise).
export function routeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

export function jsonPost(body?: unknown): Request {
  return new Request("http://test.local/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function getRequest(): Request {
  return new Request("http://test.local/api/tasks");
}
