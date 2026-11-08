import { describe, it, expect } from "vitest";
import {
  isCardHolder,
  getUserCrews,
  resolveActiveCrew,
} from "@/lib/session";
import {
  createUser,
  createCrew,
  addMember,
  setActiveCrew,
} from "../helpers/harness";

// Membership and role resolution gate every crew-scoped action, so these assert
// the authorization primitives directly.
describe("session: isCardHolder", () => {
  it("is true for the card holder of a crew", () => {
    const u = createUser();
    const crew = createCrew(u.id);

    expect(isCardHolder(u.id, crew.id)).toBe(true);
  });

  it("is false for a non-card-holder member", () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");

    expect(isCardHolder(member.id, crew.id)).toBe(false);
  });

  it("is false for an admin member (admin is not card holder)", () => {
    const holder = createUser();
    const admin = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, admin.id, "admin");

    expect(isCardHolder(admin.id, crew.id)).toBe(false);
  });

  it("is false for a user who is not in the crew at all", () => {
    const holder = createUser();
    const outsider = createUser();
    const crew = createCrew(holder.id);

    expect(isCardHolder(outsider.id, crew.id)).toBe(false);
  });
});

describe("session: getUserCrews", () => {
  it("returns every crew the user belongs to, with role and balance", () => {
    const u = createUser();
    const other = createUser();
    const crewA = createCrew(u.id, { pointBalance: 500 });
    const crewB = createCrew(other.id, { pointBalance: 300 });
    addMember(crewB.id, u.id, "crew_member");

    const result = getUserCrews(u.id);

    expect(result).toHaveLength(2);
    const a = result.find((c) => c.crewId === crewA.id);
    const b = result.find((c) => c.crewId === crewB.id);
    expect(a?.role).toBe("card_holder");
    expect(a?.pointBalance).toBe(500);
    expect(b?.role).toBe("crew_member");
    expect(b?.pointBalance).toBe(300);
  });

  it("returns an empty list for a user in no crews", () => {
    const u = createUser();
    expect(getUserCrews(u.id)).toEqual([]);
  });
});

describe("session: resolveActiveCrew", () => {
  it("returns null when the user has no crews", async () => {
    expect(await resolveActiveCrew([])).toBeNull();
  });

  it("falls back to the first crew when no cookie is set", async () => {
    const u = createUser();
    const crew = createCrew(u.id);
    setActiveCrew(null);

    const all = getUserCrews(u.id);
    const active = await resolveActiveCrew(all);

    expect(active?.crewId).toBe(crew.id);
  });

  it("honors the active-crew cookie when it matches a membership", async () => {
    const u = createUser();
    const other = createUser();
    createCrew(u.id); // first crew (would be the fallback)
    const second = createCrew(other.id);
    addMember(second.id, u.id, "crew_member");

    setActiveCrew(second.id);

    const all = getUserCrews(u.id);
    const active = await resolveActiveCrew(all);

    expect(active?.crewId).toBe(second.id);
  });

  it("ignores a cookie that does not match any membership", async () => {
    const u = createUser();
    const crew = createCrew(u.id);
    setActiveCrew("not-a-real-crew");

    const all = getUserCrews(u.id);
    const active = await resolveActiveCrew(all);

    expect(active?.crewId).toBe(crew.id);
  });
});
