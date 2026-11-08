import { describe, it, expect } from "vitest";
import { eq, and } from "drizzle-orm";
import { db, createUser, createCrew, addMember } from "../helpers/fixtures";
import { crewMembers } from "@/db/schema";
import { removeMember } from "@/lib/crew-members";

// Access everywhere in the app is gated on a live crew_members row (getUserCrews
// and every task-route membership check join on it). We assert "lost access" by
// querying that row directly, which also keeps this test off the Logto/auth
// import chain that `@/lib/session` pulls in.
function hasAccess(userId: string, crewId: string): boolean {
  return !!db
    .select({ id: crewMembers.id })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .get();
}

describe("crew membership removal", () => {
  it("lets an authorized role remove a member, ending access immediately", () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");

    expect(hasAccess(member.id, crew.id)).toBe(true);

    const r = removeMember(crew.id, holder.id, member.id);
    expect(r).toEqual({ ok: true, selfLeave: false });
    expect(hasAccess(member.id, crew.id)).toBe(false);
  });

  it("lets an admin remove a crew member", () => {
    const holder = createUser();
    const admin = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, admin.id, "admin");
    addMember(crew.id, member.id, "crew_member");

    const r = removeMember(crew.id, admin.id, member.id);
    expect(r.ok).toBe(true);
    expect(hasAccess(member.id, crew.id)).toBe(false);
  });

  it("lets a member leave on their own, ending access immediately", () => {
    const holder = createUser();
    const member = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");

    const r = removeMember(crew.id, member.id, member.id);
    expect(r).toEqual({ ok: true, selfLeave: true });
    expect(hasAccess(member.id, crew.id)).toBe(false);
  });

  it("forbids a plain member from removing someone else", () => {
    const holder = createUser();
    const a = createUser();
    const b = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, a.id, "crew_member");
    addMember(crew.id, b.id, "crew_member");

    const r = removeMember(crew.id, a.id, b.id);
    expect(r).toEqual({ ok: false, reason: "forbidden" });
    expect(hasAccess(b.id, crew.id)).toBe(true);
  });

  it("refuses to remove the card holder", () => {
    const holder = createUser();
    const admin = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, admin.id, "admin");

    const r = removeMember(crew.id, admin.id, holder.id);
    expect(r).toEqual({ ok: false, reason: "cannot_remove_card_holder" });
    expect(hasAccess(holder.id, crew.id)).toBe(true);
  });

  it("refuses to let the card holder leave their own crew", () => {
    const holder = createUser();
    const crew = createCrew(holder.id);

    const r = removeMember(crew.id, holder.id, holder.id);
    expect(r).toEqual({ ok: false, reason: "cannot_remove_card_holder" });
    expect(hasAccess(holder.id, crew.id)).toBe(true);
  });

  it("rejects an acting user who is not in the crew", () => {
    const holder = createUser();
    const member = createUser();
    const outsider = createUser();
    const crew = createCrew(holder.id);
    addMember(crew.id, member.id, "crew_member");

    const r = removeMember(crew.id, outsider.id, member.id);
    expect(r).toEqual({ ok: false, reason: "not_a_member" });
    expect(hasAccess(member.id, crew.id)).toBe(true);
  });

  it("reports when the target is not a member", () => {
    const holder = createUser();
    const stranger = createUser();
    const crew = createCrew(holder.id);

    const r = removeMember(crew.id, holder.id, stranger.id);
    expect(r).toEqual({ ok: false, reason: "target_not_member" });
  });
});
