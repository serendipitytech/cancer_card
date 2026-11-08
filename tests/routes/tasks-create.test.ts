import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/tasks/route";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createUser,
  createCrew,
  addMember,
  setSession,
  clearSession,
  jsonRequest,
  db,
} from "../helpers/harness";

const validTask = {
  title: "Drive to chemo",
  category: "transportation",
  pointCost: 50,
  requestMode: "direct" as const,
  urgency: "today" as const,
};

describe("POST /api/tasks", () => {
  it("rejects an unauthenticated request with 401", async () => {
    clearSession();
    const res = await POST(jsonRequest(validTask));
    expect(res.status).toBe(401);
  });

  it("rejects a user with no crew with 403", async () => {
    const u = createUser();
    setSession(u);
    const res = await POST(jsonRequest(validTask));
    expect(res.status).toBe(403);
  });

  it("lets the card holder create a task and persists it", async () => {
    const u = createUser({ displayName: "Holder" });
    const crew = createCrew(u.id);
    setSession(u);

    const res = await POST(jsonRequest(validTask));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Drive to chemo");
    expect(body.crewId).toBe(crew.id);
    expect(body.createdBy).toBe(u.id);
    expect(body.status).toBe("pending");

    const persisted = db.select().from(tasks).where(eq(tasks.id, body.id)).get();
    expect(persisted?.pointCost).toBe(50);
  });

  it("lets an admin create a task", async () => {
    const holder = createUser();
    const admin = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, admin.id, "admin");
    setSession(admin);

    const res = await POST(jsonRequest(validTask));
    expect(res.status).toBe(201);
  });

  it("forbids a plain crew member from creating a task", async () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");
    setSession(member);

    const res = await POST(jsonRequest(validTask));
    expect(res.status).toBe(403);
  });

  it("rejects an invalid body with 400", async () => {
    const u = createUser();
    createCrew(u.id);
    setSession(u);

    const res = await POST(jsonRequest({ ...validTask, title: "" }));
    expect(res.status).toBe(400);
  });

  it("stamps an auction end time for auction-mode tasks", async () => {
    const u = createUser();
    createCrew(u.id);
    setSession(u);

    const before = Date.now();
    const res = await POST(
      jsonRequest({
        title: "Mow the lawn",
        category: "household",
        pointCost: 100,
        requestMode: "auction",
        urgency: "whenever",
        auctionSettings: { minBid: 10, durationMinutes: 60, autoCloseAfterBids: null },
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.requestMode).toBe("auction");
    expect(body.auctionSettings.endsAt).toBeTruthy();
    const endsAt = new Date(body.auctionSettings.endsAt).getTime();
    // ~60 minutes out.
    expect(endsAt).toBeGreaterThan(before + 59 * 60 * 1000);
    expect(endsAt).toBeLessThan(before + 61 * 60 * 1000);
  });
});
