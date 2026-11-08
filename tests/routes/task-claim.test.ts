import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/tasks/[id]/claim/route";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
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

describe("POST /api/tasks/[id]/claim", () => {
  it("rejects an unauthenticated request with 401", async () => {
    clearSession();
    const res = await POST(jsonRequest({}), routeContext(MISSING_UUID));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid task id with 400", async () => {
    const u = createUser();
    createCrew(u.id);
    setSession(u);
    const res = await POST(jsonRequest({}), routeContext("not-a-uuid"));
    expect(res.status).toBe(400);
  });

  it("lets a crew member claim a pending open task", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, { requestMode: "open" });
    setSession(member);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(200);

    const persisted = db.select().from(tasks).where(eq(tasks.id, task.id)).get();
    expect(persisted?.status).toBe("claimed");
    expect(persisted?.claimedBy).toBe(member.id);
  });

  it("forbids the card holder from claiming their own task", async () => {
    const holder = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, { requestMode: "open" });
    setSession(holder);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(403);
  });

  it("forbids a non-member from claiming", async () => {
    const holder = createUser();
    const outsider = createUser();
    const crew = createCrew(holder.id);
    const task = createTask(crew.id, holder.id, { requestMode: "open" });
    setSession(outsider);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(403);
  });

  it("blocks claiming a direct task assigned to someone else", async () => {
    const holder = createUser();
    const assignee = createUser();
    const other = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, assignee.id, "crew_member");
    addMember(crew.id, other.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "direct",
      assignedTo: assignee.id,
    });
    setSession(other);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(403);
  });

  it("allows the assigned member to claim a direct task", async () => {
    const holder = createUser();
    const assignee = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, assignee.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "direct",
      assignedTo: assignee.id,
    });
    setSession(assignee);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(200);
  });

  it("returns 409 when the task is already claimed", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, {
      requestMode: "open",
      status: "claimed",
      claimedBy: member.id,
    });
    setSession(member);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(409);
  });

  it("rejects claiming an auction task (must be won by bidding)", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    const task = createTask(crew.id, holder.id, { requestMode: "auction" });
    setSession(member);

    const res = await POST(jsonRequest({}), routeContext(task.id));
    expect(res.status).toBe(400);
  });

  it("returns 404 for a missing task", async () => {
    const u = createUser();
    createCrew(u.id);
    setSession(u);
    const res = await POST(jsonRequest({}), routeContext(MISSING_UUID));
    expect(res.status).toBe(404);
  });
});
