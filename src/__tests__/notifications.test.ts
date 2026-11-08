import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
  notificationLog,
  notificationPreferences,
  activityFeed,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notifyOnEvent } from "@/lib/notification-service";
import { closeAuctionWithBid, getLowestBid } from "@/lib/auction-close";

// Let the fire-and-forget email leg of notifyOnEvent settle before asserting.
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function createUser(displayName: string, email: string): string {
  const row = db
    .insert(users)
    .values({ displayName, email })
    .returning({ id: users.id })
    .get();
  return row.id;
}

type Seed = {
  crewId: string;
  cardHolderId: string;
  helperA: string;
  helperB: string;
};

function seedCrew(): Seed {
  const cardHolderId = createUser("Holder", `holder-${crypto.randomUUID()}@t.test`);
  const helperA = createUser("Helper A", `a-${crypto.randomUUID()}@t.test`);
  const helperB = createUser("Helper B", `b-${crypto.randomUUID()}@t.test`);

  const crew = db
    .insert(crews)
    .values({
      name: "Test Crew",
      cardHolderId,
      inviteCode: crypto.randomUUID().slice(0, 8),
    })
    .returning({ id: crews.id })
    .get();

  db.insert(crewMembers)
    .values([
      { crewId: crew.id, userId: cardHolderId, role: "card_holder" },
      { crewId: crew.id, userId: helperA, role: "crew_member" },
      { crewId: crew.id, userId: helperB, role: "crew_member" },
    ])
    .run();

  return { crewId: crew.id, cardHolderId, helperA, helperB };
}

function inAppFor(userId: string, eventType: string): number {
  return db
    .select({ id: notificationLog.id })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.eventType, eventType as never),
        eq(notificationLog.channel, "in_app")
      )
    )
    .all().length;
}

beforeEach(() => {
  // Child rows first (foreign_keys = ON).
  db.delete(notificationLog).run();
  db.delete(notificationPreferences).run();
  db.delete(activityFeed).run();
  db.delete(bids).run();
  db.delete(tasks).run();
  db.delete(crewMembers).run();
  db.delete(crews).run();
  db.delete(users).run();
});

describe("task_assigned notification", () => {
  it("notifies the assignee, not the card holder who assigned", async () => {
    const s = seedCrew();

    notifyOnEvent(s.crewId, "task_assigned", s.cardHolderId, {
      taskTitle: "Walk the dog",
      assignedTo: s.helperA,
      actorName: "Holder",
    });
    await flush();

    expect(inAppFor(s.helperA, "task_assigned")).toBe(1);
    expect(inAppFor(s.cardHolderId, "task_assigned")).toBe(0);
    expect(inAppFor(s.helperB, "task_assigned")).toBe(0);
  });
});

describe("task_cancelled notification", () => {
  it("notifies whoever was on the hook (claimedBy)", async () => {
    const s = seedCrew();

    notifyOnEvent(s.crewId, "task_cancelled", s.cardHolderId, {
      taskTitle: "Pick up meds",
      claimedBy: s.helperA,
      actorName: "Holder",
    });
    await flush();

    expect(inAppFor(s.helperA, "task_cancelled")).toBe(1);
    expect(inAppFor(s.cardHolderId, "task_cancelled")).toBe(0);
  });

  it("notifies no one when the task had no owner", async () => {
    const s = seedCrew();

    notifyOnEvent(s.crewId, "task_cancelled", s.cardHolderId, {
      taskTitle: "Open task",
      actorName: "Holder",
    });
    await flush();

    expect(inAppFor(s.helperA, "task_cancelled")).toBe(0);
    expect(inAppFor(s.helperB, "task_cancelled")).toBe(0);
  });
});

describe("shared auction auto-close", () => {
  function seedAuction(s: Seed) {
    const task = db
      .insert(tasks)
      .values({
        crewId: s.crewId,
        createdBy: s.cardHolderId,
        title: "Mow the lawn",
        category: "yard",
        pointCost: 200,
        requestMode: "auction",
        status: "pending",
      })
      .returning()
      .get();

    db.insert(bids)
      .values([
        { taskId: task.id, userId: s.helperA, bidAmount: 120 },
        { taskId: task.id, userId: s.helperB, bidAmount: 80 },
      ])
      .run();

    return task;
  }

  it("awards the lowest bid, closes the task, and notifies the winner", async () => {
    const s = seedCrew();
    const task = seedAuction(s);

    const result = closeAuctionWithBid(task, getLowestBid(task.id), {
      actorId: s.helperB,
      actorName: "System",
    });
    await flush();

    expect(result).toEqual({
      closed: true,
      winnerId: s.helperB,
      winningBid: 80,
    });

    const updated = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(updated?.status).toBe("claimed");
    expect(updated?.claimedBy).toBe(s.helperB);
    expect(updated?.finalPointCost).toBe(80);

    // Winner (helperB) is notified; the higher bidder (helperA) is not a winner.
    expect(inAppFor(s.helperB, "auction_won")).toBe(1);
    expect(inAppFor(s.helperA, "auction_won")).toBe(0);
  });

  it("is idempotent: a second close does not re-award or re-notify", async () => {
    const s = seedCrew();
    const task = seedAuction(s);

    const first = closeAuctionWithBid(task, getLowestBid(task.id), {
      actorId: s.helperB,
      actorName: "System",
    });
    await flush();
    expect(first.closed).toBe(true);

    const second = closeAuctionWithBid(task, getLowestBid(task.id), {
      actorId: s.helperB,
      actorName: "System",
    });
    await flush();

    expect(second).toEqual({ closed: false, reason: "already_closed" });
    // Still exactly one winner notification from the first close.
    expect(inAppFor(s.helperB, "auction_won")).toBe(1);
  });

  it("reports no_bids when the auction has no bids", async () => {
    const s = seedCrew();
    const task = db
      .insert(tasks)
      .values({
        crewId: s.crewId,
        createdBy: s.cardHolderId,
        title: "Empty auction",
        category: "misc",
        pointCost: 50,
        requestMode: "auction",
        status: "pending",
      })
      .returning()
      .get();

    const result = closeAuctionWithBid(task, getLowestBid(task.id), {
      actorId: s.cardHolderId,
      actorName: "System",
    });

    expect(result).toEqual({ closed: false, reason: "no_bids" });
    const updated = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(updated?.status).toBe("pending");
  });
});
