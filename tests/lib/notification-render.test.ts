import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  createUser,
  createCrew,
  addMember,
} from "../helpers/fixtures";
import { users, notificationLog, activityFeed } from "@/db/schema";
import { notifyOnEvent } from "@/lib/notification-service";
import { logActivity } from "@/lib/points";
import { getUserNotifications } from "@/lib/notification-queries";

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("notifications store ids, render names at read time", () => {
  it("never freezes the actor name into the stored row", async () => {
    const holder = createUser({ displayName: "Priya Holder" });
    const member = createUser({ displayName: "Mel Member" });
    const crew = createCrew(holder.id, { name: "Support crew" });
    addMember(crew.id, member.id, "crew_member");

    notifyOnEvent(crew.id, "milestone_logged", holder.id, {
      milestoneType: "chemo",
      pointsEarned: 10,
      actorName: "Priya Holder",
    });
    await flush();

    // The raw stored row carries the placeholder + actorId, never the name.
    const raw = db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.userId, member.id))
      .get();
    expect(raw?.body).toContain("{{actor}}");
    expect(raw?.body).not.toContain("Priya");
    expect((raw?.data as Record<string, unknown>)?.actorId).toBe(holder.id);
    expect((raw?.data as Record<string, unknown>)?.actorName).toBeUndefined();
  });

  it("resolves the placeholder to the live name on read", async () => {
    const holder = createUser({ displayName: "Priya Holder" });
    const member = createUser({ displayName: "Mel Member" });
    const crew = createCrew(holder.id, { name: "Support crew" });
    addMember(crew.id, member.id, "crew_member");

    notifyOnEvent(crew.id, "milestone_logged", holder.id, {
      milestoneType: "chemo",
      pointsEarned: 10,
    });
    await flush();

    const [notif] = getUserNotifications(member.id, crew.id, {
      limit: 20,
      offset: 0,
    });
    expect(notif.body).toContain("Priya Holder");
    expect(notif.body).not.toContain("{{actor}}");
  });

  it("reflects a later name change without rewriting stored rows", async () => {
    const holder = createUser({ displayName: "Old Name" });
    const member = createUser({ displayName: "Mel Member" });
    const crew = createCrew(holder.id, { name: "Support crew" });
    addMember(crew.id, member.id, "crew_member");

    notifyOnEvent(crew.id, "milestone_logged", holder.id, {
      milestoneType: "joy",
      pointsEarned: 5,
    });
    await flush();

    db.update(users)
      .set({ displayName: "New Name" })
      .where(eq(users.id, holder.id))
      .run();

    const [notif] = getUserNotifications(member.id, crew.id, {
      limit: 20,
      offset: 0,
    });
    expect(notif.body).toContain("New Name");
    expect(notif.body).not.toContain("Old Name");
  });
});

describe("activity feed renders the actor from its id", () => {
  it("stores actorId, not the name, and joins the live name", () => {
    const holder = createUser({ displayName: "Dana Doer" });
    const crew = createCrew(holder.id, { name: "Support crew" });

    logActivity(crew.id, "task_created", holder.id, { taskTitle: "Groceries" });

    const row = db.select().from(activityFeed).where(eq(activityFeed.crewId, crew.id)).get();
    expect(row?.actorId).toBe(holder.id);
    expect(JSON.stringify(row?.data)).not.toContain("Dana");

    // The read path resolves the name by joining users (as the feed routes do).
    const rendered = db
      .select({ actorName: users.displayName, data: activityFeed.data })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.actorId, users.id))
      .where(eq(activityFeed.crewId, crew.id))
      .get();
    expect(rendered?.actorName).toBe("Dana Doer");
  });
});
