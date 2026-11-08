import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/tasks/[id]/bid/route";
import { tasks, bids } from "@/db/schema";
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

describe("POST /api/tasks/[id]/bid", () => {
  it("rejects an unauthenticated request with 401", async () => {
    clearSession();
    const res = await POST(jsonRequest({ bidAmount: 10 }), routeContext(MISSING_UUID));
    expect(res.status).toBe(401);
  });

  it("lets a crew member place a valid bid below the point cost", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings(),
    });
    setSession(member);

    const res = await POST(jsonRequest({ bidAmount: 60 }), routeContext(task.id));
    expect(res.status).toBe(201);

    const persisted = db.select().from(bids).where(eq(bids.taskId, task.id)).all();
    expect(persisted).toHaveLength(1);
    expect(persisted[0].bidAmount).toBe(60);
    expect(persisted[0].userId).toBe(member.id);
  });

  it("forbids the card holder from bidding on their own task", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings(),
    });
    setSession(holder);

    const res = await POST(jsonRequest({ bidAmount: 50 }), routeContext(task.id));
    expect(res.status).toBe(403);
  });

  it("rejects a first bid not below the point cost", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings(),
    });
    setSession(member);

    const res = await POST(jsonRequest({ bidAmount: 100 }), routeContext(task.id));
    expect(res.status).toBe(400);
  });

  it("rejects a bid that does not beat the current lowest", async () => {
    const holder = createUser();
    const a = createUser();
    const b = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, a.id, "crew_member");
    addMember(crew.id, b.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings(),
    });
    createBid(task.id, a.id, 40);
    setSession(b);

    const res = await POST(jsonRequest({ bidAmount: 45 }), routeContext(task.id));
    expect(res.status).toBe(400);
  });

  it("rejects a bid below the configured minimum", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings({ minBid: 30 }),
    });
    setSession(member);

    // 20 is below the current lowest (pointCost 100) but also below minBid 30.
    const res = await POST(jsonRequest({ bidAmount: 20 }), routeContext(task.id));
    expect(res.status).toBe(400);
  });

  it("rejects bidding on a non-auction task", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, { requestMode: "open" });
    setSession(member);

    const res = await POST(jsonRequest({ bidAmount: 10 }), routeContext(task.id));
    expect(res.status).toBe(400);
  });

  it("auto-closes and rejects a bid on an expired auction", async () => {
    const holder = createUser();
    const early = createUser();
    const late = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, early.id, "crew_member");
    addMember(crew.id, late.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      pointCost: 100,
      auctionSettings: auctionSettings({
        endsAt: new Date(Date.now() - 60 * 1000).toISOString(),
      }),
    });
    createBid(task.id, early.id, 40);
    setSession(late);

    const res = await POST(jsonRequest({ bidAmount: 20 }), routeContext(task.id));
    expect(res.status).toBe(409);

    // The expired auction auto-closed to the existing lowest bidder.
    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.status).toBe("claimed");
    expect(persisted?.claimedBy).toBe(early.id);
    expect(persisted?.finalPointCost).toBe(40);
  });
});
