import { describe, it, expect } from "vitest";
import { POST as closeAuction } from "@/app/api/tasks/[id]/close-auction/route";
import { POST as placeBid } from "@/app/api/tasks/[id]/bid/route";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createUser,
  createCrew,
  addMember,
  createTask,
  createBid,
  setSession,
  clearSession,
  jsonRequest,
  routeContext,
  MISSING_UUID,
  db,
} from "../helpers/harness";

function auctionSettings(overrides: Partial<{ minBid: number; autoCloseAfterBids: number | null; endsAt: string | null }> = {}) {
  return {
    minBid: overrides.minBid ?? 5,
    durationMinutes: 60,
    autoCloseAfterBids: overrides.autoCloseAfterBids ?? null,
    endsAt:
      overrides.endsAt === undefined
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : overrides.endsAt,
  };
}

describe("POST /api/tasks/[id]/close-auction", () => {
  it("rejects an unauthenticated request with 401", async () => {
    clearSession();
    const res = await closeAuction(
      jsonRequest({ action: "auto" }),
      routeContext(MISSING_UUID)
    );
    expect(res.status).toBe(401);
  });

  it("auto-closes to the lowest bidder", async () => {
    const holder = createUser();
    const low = createUser();
    const high = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, low.id, "crew_member");
    addMember(crew.id, high.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings(),
    });
    createBid(task.id, high.id, 80);
    createBid(task.id, low.id, 40);
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "auto" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.status).toBe("claimed");
    expect(persisted?.claimedBy).toBe(low.id);
    expect(persisted?.finalPointCost).toBe(40);
  });

  it("awards a specific bid on a select action", async () => {
    const holder = createUser();
    const a = createUser();
    const b = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, a.id, "crew_member");
    addMember(crew.id, b.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      auctionSettings: auctionSettings(),
    });
    createBid(task.id, a.id, 40);
    const chosen = createBid(task.id, b.id, 70);
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "select", bidId: chosen.id }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.claimedBy).toBe(b.id);
    expect(persisted?.finalPointCost).toBe(70);
  });

  it("requires a bidId for the select action (400)", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      auctionSettings: auctionSettings(),
    });
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "select" }),
      routeContext(task.id)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the selected bid does not exist", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      auctionSettings: auctionSettings(),
    });
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "select", bidId: MISSING_UUID }),
      routeContext(task.id)
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when there are no bids to award (auto)", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      auctionSettings: auctionSettings(),
    });
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "auto" }),
      routeContext(task.id)
    );
    expect(res.status).toBe(400);
  });

  it("forbids a non-card-holder/admin from closing (authz)", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      auctionSettings: auctionSettings(),
    });
    createBid(task.id, member.id, 40);
    setSession(member);

    const res = await closeAuction(
      jsonRequest({ action: "auto" }),
      routeContext(task.id)
    );
    expect(res.status).toBe(403);
  });

  it("rejects a non-auction task with 400", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, { requestMode: "open" });
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "auto" }),
      routeContext(task.id)
    );
    expect(res.status).toBe(400);
  });

  it("rejects closing an auction that is no longer pending with 409", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      status: "claimed",
      auctionSettings: auctionSettings(),
    });
    setSession(holder);

    const res = await closeAuction(
      jsonRequest({ action: "auto" }),
      routeContext(task.id)
    );
    expect(res.status).toBe(409);
  });
});

// The bid route also closes auctions once autoCloseAfterBids is reached.
describe("auction auto-close via the bid route", () => {
  it("closes to the lowest bidder when the bid threshold is hit", async () => {
    const holder = createUser();
    const first = createUser();
    const second = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, first.id, "crew_member");
    addMember(crew.id, second.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings({ autoCloseAfterBids: 2, minBid: 5 }),
    });

    // First bid: 60 (below pointCost 100).
    setSession(first);
    const r1 = await placeBid(
      jsonRequest({ bidAmount: 60 }),
      routeContext(task.id)
    );
    expect(r1.status).toBe(201);

    // Second bid: 40 (below current lowest 60) — hits the threshold, auto-closes.
    setSession(second);
    const r2 = await placeBid(
      jsonRequest({ bidAmount: 40 }),
      routeContext(task.id)
    );
    expect(r2.status).toBe(201);

    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.status).toBe("claimed");
    expect(persisted?.claimedBy).toBe(second.id);
    expect(persisted?.finalPointCost).toBe(40);
  });
});
