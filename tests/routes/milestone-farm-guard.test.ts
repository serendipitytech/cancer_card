import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUser, createCrew } from "../helpers/fixtures";

// The milestones route authenticates via `@/lib/auth`; mock it so we can act as
// a given user. Everything else (DB, streak logic, the farm guard) runs for real.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { POST } from "@/app/api/milestones/route";

function postMilestone(milestoneType: string): Promise<Response> {
  const request = new Request("http://localhost/api/milestones", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ milestoneType }),
  });
  return POST(request);
}

function actAs(userId: string, name = "Card Holder") {
  vi.mocked(auth).mockResolvedValue({ user: { id: userId, name } } as never);
}

describe("self-care farm guard (route level)", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("rejects a second log of the same behavior in one day, allows a different one", async () => {
    const holder = createUser();
    createCrew(holder.id);
    actAs(holder.id);

    const first = await postMilestone("meds");
    expect(first.status).toBe(200);

    const second = await postMilestone("meds");
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error).toMatch(/already logged/i);

    // A different behavior the same day is still allowed.
    const other = await postMilestone("water");
    expect(other.status).toBe(200);
  });
});
