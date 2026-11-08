import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notification-service", () => ({ notifyOnEvent: vi.fn() }));
// getUserActiveCrew reads the active-crew cookie via next/headers, which is not
// available outside a request scope, so stub it for the create-task tests.
vi.mock("@/lib/session", () => ({ getUserActiveCrew: vi.fn() }));

import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { POST as createTask } from "@/app/api/tasks/route";
import { POST as closeTask } from "@/app/api/tasks/[id]/close/route";
import { POST as placeBid } from "@/app/api/tasks/[id]/bid/route";
import {
  resetDb,
  makeUser,
  makeCrew,
  addMember,
  makeTask,
  routeParams,
  jsonPost,
} from "./fixtures";

const mockAuth = auth as unknown as Mock;
const mockActiveCrew = getUserActiveCrew as unknown as Mock;

function actingAs(id: string): void {
  mockAuth.mockResolvedValue({ user: { id, name: "Tester" } });
}

describe("cross-crew authorization checks", () => {
  beforeEach(() => resetDb());

  describe("task-create assignedTo", () => {
    it("rejects an assignee who is not a member of the creator's crew", async () => {
      const holder = makeUser("Holder");
      const crewId = makeCrew(holder);
      addMember(crewId, holder, "card_holder");
      const outsider = makeUser("Outsider");

      actingAs(holder);
      mockActiveCrew.mockResolvedValue({
        crewId,
        role: "card_holder",
        crewName: "Test Crew",
        pointBalance: 500,
        inviteCode: "abc123xy",
        cardHolderId: holder,
      });

      const res = await createTask(
        jsonPost({
          title: "Pick up meds",
          category: "errand",
          pointCost: 20,
          requestMode: "direct",
          assignedTo: outsider,
        })
      );
      expect(res.status).toBe(400);
    });

    it("accepts an assignee who is a member", async () => {
      const holder = makeUser("Holder");
      const helper = makeUser("Helper");
      const crewId = makeCrew(holder);
      addMember(crewId, holder, "card_holder");
      addMember(crewId, helper, "crew_member");

      actingAs(holder);
      mockActiveCrew.mockResolvedValue({
        crewId,
        role: "card_holder",
        crewName: "Test Crew",
        pointBalance: 500,
        inviteCode: "abc123xy",
        cardHolderId: holder,
      });

      const res = await createTask(
        jsonPost({
          title: "Pick up meds",
          category: "errand",
          pointCost: 20,
          requestMode: "direct",
          assignedTo: helper,
        })
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.assignedTo).toBe(helper);
    });
  });

  describe("close creditUserId", () => {
    it("rejects a creditUserId who is not a member of the task's crew", async () => {
      const holder = makeUser("Holder");
      const crewId = makeCrew(holder, 500);
      addMember(crewId, holder, "card_holder");
      const outsider = makeUser("Outsider");
      const taskId = makeTask(crewId, holder, {
        requestMode: "open",
        status: "claimed",
      });

      actingAs(holder);
      const res = await closeTask(
        jsonPost({ action: "complete", creditUserId: outsider }),
        routeParams(taskId)
      );
      expect(res.status).toBe(400);
    });

    it("completes when the creditUserId is a member", async () => {
      const holder = makeUser("Holder");
      const helper = makeUser("Helper");
      const crewId = makeCrew(holder, 500);
      addMember(crewId, holder, "card_holder");
      addMember(crewId, helper, "crew_member");
      const taskId = makeTask(crewId, holder, {
        requestMode: "open",
        status: "claimed",
        claimedBy: helper,
        pointCost: 40,
      });

      actingAs(holder);
      const res = await closeTask(
        jsonPost({ action: "complete", creditUserId: helper }),
        routeParams(taskId)
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("completed");
    });
  });

  describe("bid membership", () => {
    it("rejects a bid from a non-member", async () => {
      const holder = makeUser("Holder");
      const crewId = makeCrew(holder);
      addMember(crewId, holder, "card_holder");
      const taskId = makeTask(crewId, holder, {
        requestMode: "auction",
        status: "pending",
        pointCost: 100,
        auctionSettings: {
          minBid: 5,
          durationMinutes: 60,
          autoCloseAfterBids: null,
          endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      });

      const outsider = makeUser("Outsider");
      actingAs(outsider);
      const res = await placeBid(
        jsonPost({ bidAmount: 50 }),
        routeParams(taskId)
      );
      expect(res.status).toBe(403);
    });
  });
});
