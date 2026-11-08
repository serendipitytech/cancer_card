import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notification-service", () => ({ notifyOnEvent: vi.fn() }));

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { GET as checkAuction } from "@/app/api/tasks/[id]/check-auction/route";
import { POST as placeBid } from "@/app/api/tasks/[id]/bid/route";
import {
  resetDb,
  makeUser,
  makeCrew,
  addMember,
  makeTask,
  makeBid,
  routeParams,
  jsonPost,
  getRequest,
} from "./fixtures";

const mockAuth = auth as unknown as Mock;
function actingAs(id: string): void {
  mockAuth.mockResolvedValue({ user: { id, name: "Tester" } });
}

function expiredAuctionTask(crewId: string, createdBy: string): string {
  return makeTask(crewId, createdBy, {
    requestMode: "auction",
    status: "pending",
    pointCost: 100,
    auctionSettings: {
      minBid: 5,
      durationMinutes: 60,
      autoCloseAfterBids: null,
      endsAt: new Date(Date.now() - 60 * 1000).toISOString(),
    },
  });
}

describe("check-auction read-only + membership", () => {
  beforeEach(() => resetDb());

  it("reports an expired auction without mutating it", async () => {
    const holder = makeUser("Holder");
    const helper = makeUser("Helper");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    addMember(crewId, helper, "crew_member");
    const taskId = expiredAuctionTask(crewId, holder);
    makeBid(taskId, helper, 40);

    actingAs(helper);
    const res = await checkAuction(getRequest(), routeParams(taskId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("expired");
    expect(body.expired).toBe(true);

    // The call must not have closed/awarded the auction.
    const after = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    expect(after?.status).toBe("pending");
    expect(after?.claimedBy).toBeNull();
    expect(after?.finalPointCost).toBeNull();
  });

  it("rejects a non-member", async () => {
    const holder = makeUser("Holder");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    const taskId = expiredAuctionTask(crewId, holder);

    const outsider = makeUser("Outsider");
    actingAs(outsider);
    const res = await checkAuction(getRequest(), routeParams(taskId));
    expect(res.status).toBe(403);
  });
});

describe("bid auto-close path authorization", () => {
  beforeEach(() => resetDb());

  it("a non-member cannot trigger the expired-auction auto-close", async () => {
    const holder = makeUser("Holder");
    const helper = makeUser("Helper");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    addMember(crewId, helper, "crew_member");
    const taskId = expiredAuctionTask(crewId, holder);
    makeBid(taskId, helper, 40);

    const outsider = makeUser("Outsider");
    actingAs(outsider);
    const res = await placeBid(jsonPost({ bidAmount: 10 }), routeParams(taskId));
    expect(res.status).toBe(403);

    // The auto-close side effect must not have run for a non-member.
    const after = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    expect(after?.status).toBe("pending");
    expect(after?.claimedBy).toBeNull();
  });
});
