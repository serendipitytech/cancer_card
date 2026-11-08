import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  createUser,
  createCrew,
  addMember,
  createTask,
  createBid,
  createMilestone,
} from "../helpers/fixtures";
import {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
  milestones,
  activityFeed,
  notificationLog,
  pushTokens,
} from "@/db/schema";
import { notifyOnEvent } from "@/lib/notification-service";
import { logActivity } from "@/lib/points";
import {
  anonymizeUserData,
  ANONYMIZED_CREW_NAME,
  ANONYMIZED_DISPLAY_NAME,
} from "@/lib/account-deletion";
import { getUserNotifications } from "@/lib/notification-queries";

// A distinctive token that must not survive anywhere after deletion.
const NAME = "Zarathustra Vexmoor";
const TOKEN = "Zarathustra";

const flush = () => new Promise((resolve) => setImmediate(resolve));

// Every table that could hold a copy of the person's name. The test dumps each
// to JSON and asserts the token is gone.
const SCANNED = {
  users,
  crews,
  crew_members: crewMembers,
  tasks,
  bids,
  milestones,
  activity_feed: activityFeed,
  notification_log: notificationLog,
  push_tokens: pushTokens,
} as const;

async function seedWorld() {
  const holder = createUser({ displayName: NAME, email: "zara@example.test" });
  const member = createUser({ displayName: "Mel Member" });
  const crew = createCrew(holder.id, { name: `${NAME}'s chemo crew` });
  addMember(crew.id, member.id, "crew_member");

  // Free text the holder authored, embedding their name.
  const task = createTask(crew.id, holder.id, { title: "Drive to chemo" });
  createBid(task.id, holder.id, 20, `${NAME} can chip in for gas`);
  createMilestone(crew.id, holder.id, "chemo", `${NAME} felt strong today`);

  // A push token (device identifier / secret).
  db.insert(pushTokens)
    .values({
      userId: holder.id,
      tokenType: "web",
      endpoint: "https://push.example/endpoint-1",
      p256dh: "k",
      authKey: "a",
    })
    .run();

  // A notification ABOUT the holder, sent to the member (real service path).
  notifyOnEvent(crew.id, "milestone_logged", holder.id, {
    milestoneType: "chemo",
    pointsEarned: 10,
    actorName: NAME,
  });
  // A notification IN the holder's own inbox (member claims a task).
  notifyOnEvent(crew.id, "task_claimed", member.id, {
    taskTitle: "Drive to chemo",
    actorName: "Mel Member",
  });
  await flush();

  // Activity the holder is the actor of (feed stores actorId, not the name).
  logActivity(crew.id, "task_created", holder.id, { taskTitle: "Drive to chemo" });

  return { holder, member, crew, task };
}

describe("account deletion completeness", () => {
  it("leaves zero residual name across every scanned table", async () => {
    const { holder } = await seedWorld();

    // Sanity: the name IS present somewhere before deletion.
    const beforeUsers = JSON.stringify(db.select().from(users).all());
    expect(beforeUsers).toContain(TOKEN);

    anonymizeUserData(holder.id);
    await flush();

    for (const [label, table] of Object.entries(SCANNED)) {
      const rows = db.select().from(table).all();
      const dump = JSON.stringify(rows);
      expect(dump, `${label} still contains the name`).not.toContain(TOKEN);
    }
  });

  it("scrubs the specific listed surfaces", async () => {
    const { holder, crew } = await seedWorld();
    anonymizeUserData(holder.id);
    await flush();

    const userRow = db.select().from(users).where(eq(users.id, holder.id)).get();
    expect(userRow?.displayName).toBe(ANONYMIZED_DISPLAY_NAME);
    expect(userRow?.deletedAt).toBeTruthy();
    expect(userRow?.logtoId).toBeNull();

    const crewRow = db.select().from(crews).where(eq(crews.id, crew.id)).get();
    expect(crewRow?.name).toBe(ANONYMIZED_CREW_NAME);

    // Invite code rotated to a fresh 8-char code, not the seeded one.
    expect(crewRow?.inviteCode).toHaveLength(8);

    // Free text nulled.
    const bidRows = db.select().from(bids).where(eq(bids.userId, holder.id)).all();
    expect(bidRows.every((b) => b.comment === null)).toBe(true);
    const msRows = db
      .select()
      .from(milestones)
      .where(eq(milestones.userId, holder.id))
      .all();
    expect(msRows.every((m) => m.note === null)).toBe(true);

    // Push tokens gone.
    const tokens = db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, holder.id))
      .all();
    expect(tokens).toHaveLength(0);

    // The holder's own notification inbox is deleted.
    const inbox = db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.userId, holder.id))
      .all();
    expect(inbox).toHaveLength(0);
  });

  it("keeps crew membership and shared history intact (anonymize, not cascade)", async () => {
    const { holder, crew } = await seedWorld();
    anonymizeUserData(holder.id);

    // The user row and crew survive; the card-holder membership is still there.
    expect(db.select().from(users).where(eq(users.id, holder.id)).get()).toBeTruthy();
    const membership = db
      .select()
      .from(crewMembers)
      .where(eq(crewMembers.userId, holder.id))
      .all();
    expect(membership.length).toBeGreaterThan(0);
    expect(
      db.select().from(crews).where(eq(crews.id, crew.id)).get()
    ).toBeTruthy();
  });

  it("still renders notifications about the closed account as a former member", async () => {
    const { holder, member, crew } = await seedWorld();
    anonymizeUserData(holder.id);
    await flush();

    const notifs = getUserNotifications(member.id, crew.id, {
      limit: 20,
      offset: 0,
    });
    const milestoneNote = notifs.find((n) => n.eventType === "milestone_logged");
    expect(milestoneNote).toBeTruthy();
    // Rendered from the id to the live (now anonymized) name, no placeholder,
    // no residual original name.
    expect(milestoneNote?.body).toContain(ANONYMIZED_DISPLAY_NAME);
    expect(milestoneNote?.body).not.toContain("{{actor}}");
    expect(milestoneNote?.body).not.toContain(TOKEN);
  });
});
