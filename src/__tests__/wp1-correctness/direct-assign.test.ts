import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notification-service", () => ({ notifyOnEvent: vi.fn() }));

import { auth } from "@/lib/auth";
import { POST as assignTask } from "@/app/api/tasks/[id]/assign/route";
import { POST as claimTask } from "@/app/api/tasks/[id]/claim/route";
import { GET as getTask } from "@/app/api/tasks/[id]/route";
import {
  resetDb,
  makeUser,
  makeCrew,
  addMember,
  makeTask,
  routeParams,
  jsonPost,
  getRequest,
} from "./fixtures";

const mockAuth = auth as unknown as Mock;
function actingAs(id: string): void {
  mockAuth.mockResolvedValue({ user: { id, name: "Tester" } });
}

// Regression for the direct-assign mismatch: the API persists requestMode as
// "direct" (never "direct_assign"), and a directly-assigned member can claim.
// The old UI compared against "direct_assign", so the Claim button never showed.
describe("direct-assign claim visibility", () => {
  beforeEach(() => resetDb());

  it("assigning a task stores requestMode 'direct' and lets the assignee claim", async () => {
    const holder = makeUser("Holder");
    const helper = makeUser("Helper");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    addMember(crewId, helper, "crew_member");
    const taskId = makeTask(crewId, holder, { requestMode: "open" });

    // Card holder assigns the task to the helper.
    actingAs(holder);
    const assignRes = await assignTask(
      jsonPost({ userId: helper }),
      routeParams(taskId)
    );
    expect(assignRes.status).toBe(200);
    const assigned = await assignRes.json();
    expect(assigned.requestMode).toBe("direct");
    expect(assigned.requestMode).not.toBe("direct_assign");
    expect(assigned.assignedTo).toBe(helper);

    // The detail payload the UI consumes carries the same contract the Claim
    // button now keys off of (requestMode === "direct" && assignedTo === me).
    actingAs(helper);
    const detailRes = await getTask(getRequest(), routeParams(taskId));
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.requestMode).toBe("direct");
    expect(detail.assignedTo).toBe(helper);

    // And the assignee can actually claim it.
    const claimRes = await claimTask(getRequest(), routeParams(taskId));
    expect(claimRes.status).toBe(200);
    const claimed = await claimRes.json();
    expect(claimed.status).toBe("claimed");
    expect(claimed.claimedBy).toBe(helper);
  });

  it("rejects a claim from a member the direct task is not assigned to", async () => {
    const holder = makeUser("Holder");
    const helper = makeUser("Helper");
    const other = makeUser("Other");
    const crewId = makeCrew(holder);
    addMember(crewId, holder, "card_holder");
    addMember(crewId, helper, "crew_member");
    addMember(crewId, other, "crew_member");
    const taskId = makeTask(crewId, holder, {
      requestMode: "direct",
      assignedTo: helper,
    });

    actingAs(other);
    const claimRes = await claimTask(getRequest(), routeParams(taskId));
    expect(claimRes.status).toBe(403);
  });
});
