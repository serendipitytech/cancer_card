import { db } from "./test-db";
import {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
  milestones,
  selfCareRoutines,
} from "@/db/schema";
import type { TestAuthState, TestSession } from "./auth-state";

// ─── Session control ──────────────────────────────────────────────────────────
// These drive the fake `auth()` / cookie mocks registered in tests/setup.ts.

function authState(): TestAuthState {
  return (globalThis as unknown as { __ccAuthState: TestAuthState })
    .__ccAuthState;
}

type SessionUser = { id: string; displayName?: string | null };

/** Make subsequent route calls behave as this signed-in user. */
export function setSession(user: SessionUser): void {
  const session: TestSession = {
    user: {
      id: user.id,
      name: user.displayName ?? null,
      email: null,
      image: null,
    },
  };
  authState().session = session;
}

export function clearSession(): void {
  authState().session = null;
}

/** Pin the active crew the way the cookie would (otherwise the first crew wins). */
export function setActiveCrew(crewId: string | null): void {
  authState().activeCrewId = crewId;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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
    .values({
      displayName,
      email,
      // bcrypt placeholder — auth is mocked, this value is never verified.
      passwordHash: "$2a$10$testtesttesttesttesttesttesttesttesttesttesttesttest",
    })
    .returning()
    .get();
  return { id: row.id, displayName: row.displayName, email: row.email };
}

export type SeededCrew = {
  id: string;
  cardHolderId: string;
  inviteCode: string;
};

/**
 * Create a crew owned by `cardHolderId` and register that user as the
 * card_holder member. Returns ids for use in further fixtures.
 */
export function createCrew(
  cardHolderId: string,
  overrides: Partial<{ name: string; pointBalance: number; inviteCode: string }> = {}
): SeededCrew {
  const inviteCode = overrides.inviteCode ?? uniq("inv").slice(0, 8).padEnd(8, "0");
  const crew = db
    .insert(crews)
    .values({
      name: overrides.name ?? uniq("Crew"),
      cardHolderId,
      pointBalance: overrides.pointBalance ?? 500,
      inviteCode,
    })
    .returning()
    .get();

  db.insert(crewMembers)
    .values({ crewId: crew.id, userId: cardHolderId, role: "card_holder" })
    .run();

  return { id: crew.id, cardHolderId, inviteCode: crew.inviteCode };
}

export type CrewRole = "card_holder" | "admin" | "crew_member";

/** Add an existing user to a crew with the given role. */
export function addMember(
  crewId: string,
  userId: string,
  role: CrewRole = "crew_member"
): void {
  db.insert(crewMembers).values({ crewId, userId, role }).run();
}

type TaskOverrides = Partial<{
  title: string;
  category: string;
  pointCost: number;
  requestMode: "direct" | "open" | "auction";
  status: "pending" | "claimed" | "in_progress" | "completed" | "cancelled";
  assignedTo: string | null;
  claimedBy: string | null;
  finalPointCost: number | null;
  auctionSettings: {
    minBid: number;
    durationMinutes: number;
    autoCloseAfterBids: number | null;
    endsAt: string | null;
  } | null;
}>;

export function createTask(
  crewId: string,
  createdBy: string,
  overrides: TaskOverrides = {}
) {
  return db
    .insert(tasks)
    .values({
      crewId,
      createdBy,
      title: overrides.title ?? uniq("Task"),
      category: overrides.category ?? "general",
      pointCost: overrides.pointCost ?? 50,
      requestMode: overrides.requestMode ?? "open",
      status: overrides.status ?? "pending",
      assignedTo: overrides.assignedTo ?? null,
      claimedBy: overrides.claimedBy ?? null,
      finalPointCost: overrides.finalPointCost ?? null,
      auctionSettings: overrides.auctionSettings ?? null,
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
  loggedAt: Date,
  pointsEarned = 10
) {
  return db
    .insert(milestones)
    .values({ crewId, userId, milestoneType, pointsEarned, loggedAt })
    .returning()
    .get();
}

export function createRoutine(
  crewId: string,
  milestoneType: string,
  pointValue: number,
  name = "Routine"
) {
  return db
    .insert(selfCareRoutines)
    .values({ crewId, name, milestoneType, pointValue, emoji: "💊" })
    .returning()
    .get();
}

// ─── Reading state back ──────────────────────────────────────────────────────

export { db };

// ─── Route invocation ─────────────────────────────────────────────────────────

/** Build a JSON Request for a route handler under test. */
export function jsonRequest(
  body: unknown,
  init: { method?: string; url?: string } = {}
): Request {
  return new Request(init.url ?? "http://test.local/api", {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Build the `{ params }` arg Next route handlers receive for `[id]` routes. */
export function routeContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** A syntactically valid but absent UUID, for not-found / authz tests. */
export const MISSING_UUID = "00000000-0000-4000-8000-000000000000";
