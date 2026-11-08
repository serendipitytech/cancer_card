import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/milestones/route";
import { crews, milestones } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createUser,
  createCrew,
  addMember,
  createRoutine,
  createMilestone,
  setSession,
  clearSession,
  jsonRequest,
  db,
} from "../helpers/harness";

function balanceOf(crewId: string): number {
  return (
    db.select({ b: crews.pointBalance }).from(crews).where(eq(crews.id, crewId)).get()
      ?.b ?? NaN
  );
}

function daysAgoNoon(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// Logging a self-care milestone is the main point-earn path (plus streak bonuses).
describe("POST /api/milestones", () => {
  it("rejects an unauthenticated request with 401", async () => {
    clearSession();
    const res = await POST(jsonRequest({ milestoneType: "meds" }));
    expect(res.status).toBe(401);
  });

  it("lets the card holder log a milestone and credits the routine's points", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    createRoutine(crew.id, "meds", 15, "Take meds");
    setSession(holder);

    const res = await POST(jsonRequest({ milestoneType: "meds" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pointsEarned).toBe(15);
    expect(body.streakBonus).toBe(0);
    expect(balanceOf(crew.id)).toBe(515);

    const logged = db
      .select()
      .from(milestones)
      .where(eq(milestones.crewId, crew.id))
      .all();
    expect(logged).toHaveLength(1);
    expect(logged[0].milestoneType).toBe("meds");
  });

  it("defaults to 10 points when no routine is configured for the type", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    setSession(holder);

    const res = await POST(jsonRequest({ milestoneType: "hydrate" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pointsEarned).toBe(10);
    expect(balanceOf(crew.id)).toBe(510);
  });

  it("forbids a non-card-holder from logging milestones", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    addMember(crew.id, member.id, "crew_member");
    setSession(member);

    const res = await POST(jsonRequest({ milestoneType: "meds" }));
    expect(res.status).toBe(403);
    expect(balanceOf(crew.id)).toBe(500);
  });

  it("awards the streak bonus on the third consecutive meds day", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    createRoutine(crew.id, "meds", 15, "Take meds");
    // Two prior consecutive days already logged; today's log makes it 3.
    createMilestone(crew.id, holder.id, "meds", daysAgoNoon(1), 15);
    createMilestone(crew.id, holder.id, "meds", daysAgoNoon(2), 15);
    setSession(holder);

    const res = await POST(jsonRequest({ milestoneType: "meds" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pointsEarned).toBe(15);
    expect(body.streakBonus).toBe(50);
    // 500 + 15 (log) + 50 (bonus).
    expect(balanceOf(crew.id)).toBe(565);
    expect(body.newBalance).toBe(565);
  });

  it("rejects an invalid body with 400", async () => {
    const holder = createUser();
    createCrew(holder.id);
    setSession(holder);

    const res = await POST(jsonRequest({ milestoneType: "" }));
    expect(res.status).toBe(400);
  });
});
