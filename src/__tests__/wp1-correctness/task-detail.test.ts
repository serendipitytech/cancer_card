import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notification-service", () => ({ notifyOnEvent: vi.fn() }));

import { auth } from "@/lib/auth";
import { GET as getTask } from "@/app/api/tasks/[id]/route";
import {
  resetDb,
  makeUser,
  makeCrew,
  addMember,
  makeTask,
  routeParams,
  getRequest,
} from "./fixtures";

const mockAuth = auth as unknown as Mock;
function actingAs(id: string): void {
  mockAuth.mockResolvedValue({ user: { id, name: "Tester" } });
}

describe("GET /api/tasks/[id] membership", () => {
  beforeEach(() => resetDb());

  it("returns the enriched task for a crew member", async () => {
    const holder = makeUser("Holder");
    const helper = makeUser("Helper");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    addMember(crewId, helper, "crew_member");
    const taskId = makeTask(crewId, holder, {
      requestMode: "direct",
      assignedTo: helper,
    });

    actingAs(helper);
    const res = await getTask(getRequest(), routeParams(taskId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(taskId);
    expect(body.assignedUser?.displayName).toBe("Helper");
    expect(Array.isArray(body.bids)).toBe(true);
  });

  it("rejects a user who is not a member of the task's crew", async () => {
    const holder = makeUser("Holder");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    const taskId = makeTask(crewId, holder);

    const outsider = makeUser("Outsider");
    actingAs(outsider);
    const res = await getTask(getRequest(), routeParams(taskId));
    expect(res.status).toBe(403);
  });

  it("returns 404 for a task that does not exist", async () => {
    const holder = makeUser("Holder");
    makeCrew(holder);
    actingAs(holder);
    const res = await getTask(
      getRequest(),
      routeParams("00000000-0000-4000-8000-000000000000")
    );
    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await getTask(
      getRequest(),
      routeParams("00000000-0000-4000-8000-000000000000")
    );
    expect(res.status).toBe(401);
  });
});
