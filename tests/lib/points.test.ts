import { describe, it, expect } from "vitest";
import { deductPoints, addPoints, getPointBalance, logActivity } from "@/lib/points";
import { activityFeed } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createUser, createCrew, db } from "../helpers/harness";

// Point spend/earn math is the money path. These assert the exact arithmetic,
// including the deliberate design choice that a crew balance may go negative.
describe("points: spend/earn math", () => {
  it("deducts the exact amount and returns the new balance", () => {
    const u = createUser();
    const crew = createCrew(u.id, { pointBalance: 500 });

    const balance = deductPoints(crew.id, 120);

    expect(balance).toBe(380);
    expect(getPointBalance(crew.id)).toBe(380);
  });

  it("adds the exact amount and returns the new balance", () => {
    const u = createUser();
    const crew = createCrew(u.id, { pointBalance: 500 });

    const balance = addPoints(crew.id, 75);

    expect(balance).toBe(575);
    expect(getPointBalance(crew.id)).toBe(575);
  });

  it("allows the balance to go negative (by design)", () => {
    const u = createUser();
    const crew = createCrew(u.id, { pointBalance: 30 });

    const balance = deductPoints(crew.id, 100);

    expect(balance).toBe(-70);
    expect(getPointBalance(crew.id)).toBe(-70);
  });

  it("is composable: a sequence of spends and earns nets correctly", () => {
    const u = createUser();
    const crew = createCrew(u.id, { pointBalance: 500 });

    deductPoints(crew.id, 50);
    addPoints(crew.id, 200);
    deductPoints(crew.id, 25);

    expect(getPointBalance(crew.id)).toBe(625);
  });

  it("getPointBalance returns 0 for an unknown crew", () => {
    expect(getPointBalance("does-not-exist")).toBe(0);
  });
});

describe("points: activity logging", () => {
  it("records an activity row scoped to the crew and actor", () => {
    const u = createUser();
    const crew = createCrew(u.id);

    logActivity(crew.id, "task_created", u.id, { taskTitle: "Drive to appt" });

    const rows = db
      .select()
      .from(activityFeed)
      .where(eq(activityFeed.crewId, crew.id))
      .all();

    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe("task_created");
    expect(rows[0].actorId).toBe(u.id);
    expect(rows[0].data).toEqual({ taskTitle: "Drive to appt" });
  });
});
