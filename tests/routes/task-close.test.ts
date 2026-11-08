import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/tasks/[id]/close/route";
import { tasks, crews, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createUser,
  createCrew,
  addMember,
  createTask,
  setSession,
  clearSession,
  jsonRequest,
  routeContext,
  MISSING_UUID,
  db,
} from "../helpers/harness";

function balanceOf(crewId: string): number {
  return (
    db.select({ b: crews.pointBalance }).from(crews).where(eq(crews.id, crewId)).get()
      ?.b ?? NaN
  );
}

// Closing a task as "complete" is the primary point-spend money path.
describe("POST /api/tasks/[id]/close", () => {
  it("rejects an unauthenticated request with 401", async () => {
    clearSession();
    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(MISSING_UUID)
    );
    expect(res.status).toBe(401);
  });

  it("completing a task deducts the point cost from the crew balance", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    const task = createTask(crew.id, holder.id, {
      requestMode: "open",
      status: "claimed",
      pointCost: 120,
    });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    expect(balanceOf(crew.id)).toBe(380);
    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.status).toBe("completed");
    expect(persisted?.finalPointCost).toBe(120);
    expect(persisted?.completedAt).toBeTruthy();
  });

  it("lets the balance go negative on completion (by design)", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 30 });
    const task = createTask(crew.id, holder.id, {
      status: "claimed",
      pointCost: 100,
    });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    expect(balanceOf(crew.id)).toBe(-70);
  });

  it("prefers finalPointCost (auction price) over the listed pointCost", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    const task = createTask(crew.id, holder.id, {
      requestMode: "auction",
      status: "claimed",
      pointCost: 100,
      finalPointCost: 35,
    });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    expect(balanceOf(crew.id)).toBe(465);
  });

  it("credits the helper's member stats when creditUserId is given", async () => {
    const holder = createUser();
    const helper = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    addMember(crew.id, helper.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      status: "claimed",
      pointCost: 60,
      claimedBy: helper.id,
    });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "complete", creditUserId: helper.id }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    const member = db
      .select()
      .from(crewMembers)
      .where(
        and(eq(crewMembers.crewId, crew.id), eq(crewMembers.userId, helper.id))
      )
      .get();
    const stats = member?.stats as { tasksCompleted: number; pointsSpent: number };
    expect(stats.tasksCompleted).toBe(1);
    expect(stats.pointsSpent).toBe(60);
  });

  it("cancelling a task does NOT deduct points", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    const task = createTask(crew.id, holder.id, {
      status: "claimed",
      pointCost: 120,
    });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "cancel" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(200);
    expect(balanceOf(crew.id)).toBe(500);
    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.status).toBe("cancelled");
  });

  it("forbids a non-member from closing a task (cross-crew authz)", async () => {
    const holder = createUser();
    const outsider = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    const task = createTask(crew.id, holder.id, { status: "claimed", pointCost: 50 });
    setSession(outsider);

    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(403);
    expect(balanceOf(crew.id)).toBe(500);
  });

  it("forbids a plain crew member from closing a task", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, { status: "claimed", pointCost: 50 });
    setSession(member);

    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(403);
    expect(balanceOf(crew.id)).toBe(500);
  });

  it("returns 409 when the task is already closed", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { pointBalance: 500 });
    const task = createTask(crew.id, holder.id, {
      status: "completed",
      pointCost: 50,
    });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "complete" }),
      routeContext(task.id)
    );

    expect(res.status).toBe(409);
    // No double-charge.
    expect(balanceOf(crew.id)).toBe(500);
  });

  it("rejects an invalid action with 400", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, { status: "claimed" });
    setSession(holder);

    const res = await POST(
      jsonRequest({ action: "explode" }),
      routeContext(task.id)
    );
    expect(res.status).toBe(400);
  });
});
