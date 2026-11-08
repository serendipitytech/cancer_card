import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db, createUser, createCrew } from "../helpers/fixtures";
import { crews, crewMembers } from "@/db/schema";
import {
  evaluateInvite,
  redeemInvite,
  revokeInvite,
  rotateInvite,
  updateInviteSettings,
} from "@/lib/invite";

const HOUR = 60 * 60 * 1000;

// A joining user that is not already in the crew.
function joiner(email = "joiner@example.test") {
  return createUser({ displayName: "Jo Joiner", email });
}

function membershipRow(crewId: string, userId: string) {
  return db
    .select()
    .from(crewMembers)
    .where(eq(crewMembers.crewId, crewId))
    .all()
    .find((m) => m.userId === userId);
}

describe("evaluateInvite (pure)", () => {
  const now = Date.now();
  const base = {
    expiresAt: null,
    maxUses: null,
    useCount: 0,
    revokedAt: null,
    boundEmail: null,
  };

  it("accepts an unrestricted active invite", () => {
    expect(evaluateInvite(base, { nowMs: now, email: "a@b.test" })).toEqual({
      ok: true,
    });
  });

  it("rejects a revoked invite before anything else", () => {
    const r = evaluateInvite(
      { ...base, revokedAt: new Date(now - HOUR), expiresAt: new Date(now - HOUR) },
      { nowMs: now, email: "a@b.test" }
    );
    expect(r).toEqual({ ok: false, reason: "revoked" });
  });

  it("rejects an expired invite", () => {
    const r = evaluateInvite(
      { ...base, expiresAt: new Date(now - 1) },
      { nowMs: now, email: "a@b.test" }
    );
    expect(r).toEqual({ ok: false, reason: "expired" });
  });

  it("accepts right up to the expiry instant", () => {
    const r = evaluateInvite(
      { ...base, expiresAt: new Date(now) },
      { nowMs: now, email: "a@b.test" }
    );
    expect(r).toEqual({ ok: true });
  });

  it("rejects an exhausted invite", () => {
    const r = evaluateInvite(
      { ...base, maxUses: 2, useCount: 2 },
      { nowMs: now, email: "a@b.test" }
    );
    expect(r).toEqual({ ok: false, reason: "exhausted" });
  });

  it("rejects a mismatched bound email, case-insensitively accepts a match", () => {
    expect(
      evaluateInvite(
        { ...base, boundEmail: "target@x.test" },
        { nowMs: now, email: "someone@y.test" }
      )
    ).toEqual({ ok: false, reason: "email_mismatch" });

    expect(
      evaluateInvite(
        { ...base, boundEmail: "Target@X.test" },
        { nowMs: now, email: "TARGET@x.test" }
      )
    ).toEqual({ ok: true });
  });
});

describe("redeemInvite", () => {
  it("rejects an unknown code", () => {
    const u = joiner();
    const r = redeemInvite({
      code: "NOSUCHCODE",
      userId: u.id,
      userEmail: u.email,
    });
    expect(r).toEqual({ ok: false, reason: "not_found" });
  });

  it("accepts a valid code, adds membership, and increments useCount", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { inviteCode: "GOODCODE" });
    const u = joiner();

    const r = redeemInvite({
      code: "goodcode", // normalized to upper-case
      userId: u.id,
      userEmail: u.email,
    });

    expect(r.ok).toBe(true);
    expect(membershipRow(crew.id, u.id)?.role).toBe("crew_member");

    const row = db.select().from(crews).where(eq(crews.id, crew.id)).get();
    expect(row?.inviteUseCount).toBe(1);
  });

  it("rejects an expired code and does not add membership", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, {
      inviteCode: "EXPIRED1",
      inviteExpiresAt: new Date(Date.now() - HOUR),
    });
    const u = joiner();

    const r = redeemInvite({
      code: "EXPIRED1",
      userId: u.id,
      userEmail: u.email,
    });

    expect(r).toEqual({ ok: false, reason: "expired" });
    expect(membershipRow(crew.id, u.id)).toBeUndefined();
    expect(
      db.select().from(crews).where(eq(crews.id, crew.id)).get()?.inviteUseCount
    ).toBe(0);
  });

  it("rejects an exhausted (max-uses) code", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, {
      inviteCode: "FULLCODE",
      inviteMaxUses: 1,
      inviteUseCount: 1,
    });
    const u = joiner();

    const r = redeemInvite({
      code: "FULLCODE",
      userId: u.id,
      userEmail: u.email,
    });

    expect(r).toEqual({ ok: false, reason: "exhausted" });
    expect(membershipRow(crew.id, u.id)).toBeUndefined();
  });

  it("enforces the max-uses cap across sequential redemptions", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, {
      inviteCode: "CAP2CODE",
      inviteMaxUses: 2,
    });
    const a = joiner("a@example.test");
    const b = joiner("b@example.test");
    const c = joiner("c@example.test");

    expect(
      redeemInvite({ code: "CAP2CODE", userId: a.id, userEmail: a.email }).ok
    ).toBe(true);
    expect(
      redeemInvite({ code: "CAP2CODE", userId: b.id, userEmail: b.email }).ok
    ).toBe(true);
    const third = redeemInvite({
      code: "CAP2CODE",
      userId: c.id,
      userEmail: c.email,
    });
    expect(third).toEqual({ ok: false, reason: "exhausted" });
    expect(
      db.select().from(crews).where(eq(crews.id, crew.id)).get()?.inviteUseCount
    ).toBe(2);
  });

  it("rejects a revoked code", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, { inviteCode: "REVOKED1" });
    revokeInvite(crew.id);
    const u = joiner();

    const r = redeemInvite({
      code: "REVOKED1",
      userId: u.id,
      userEmail: u.email,
    });

    expect(r).toEqual({ ok: false, reason: "revoked" });
    expect(membershipRow(crew.id, u.id)).toBeUndefined();
  });

  it("rejects a wrong-email-bound code and accepts the bound email", () => {
    const holder = createUser();
    createCrew(holder.id, {
      inviteCode: "BOUNDED1",
      inviteBoundEmail: "invited@example.test",
    });

    const wrong = joiner("stranger@example.test");
    expect(
      redeemInvite({ code: "BOUNDED1", userId: wrong.id, userEmail: wrong.email })
    ).toEqual({ ok: false, reason: "email_mismatch" });

    const right = joiner("Invited@Example.test");
    expect(
      redeemInvite({ code: "BOUNDED1", userId: right.id, userEmail: right.email })
        .ok
    ).toBe(true);
  });

  it("rejects a second redemption by an existing member", () => {
    const holder = createUser();
    createCrew(holder.id, { inviteCode: "ONCECODE" });
    const u = joiner();

    expect(
      redeemInvite({ code: "ONCECODE", userId: u.id, userEmail: u.email }).ok
    ).toBe(true);
    expect(
      redeemInvite({ code: "ONCECODE", userId: u.id, userEmail: u.email })
    ).toEqual({ ok: false, reason: "already_member" });
  });
});

describe("invite settings helpers", () => {
  it("rotateInvite mints a new code and clears restrictions", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, {
      inviteCode: "OLDCODE1",
      inviteRevokedAt: new Date(),
      inviteMaxUses: 1,
      inviteUseCount: 1,
      inviteBoundEmail: "x@y.test",
    });

    const fresh = rotateInvite(crew.id);
    const row = db.select().from(crews).where(eq(crews.id, crew.id)).get();

    expect(fresh).toHaveLength(8);
    expect(row?.inviteCode).toBe(fresh);
    expect(row?.inviteCode).not.toBe("OLDCODE1");
    expect(row?.inviteRevokedAt).toBeNull();
    expect(row?.inviteMaxUses).toBeNull();
    expect(row?.inviteUseCount).toBe(0);
    expect(row?.inviteBoundEmail).toBeNull();

    // The old code no longer resolves to anything.
    const u = joiner();
    expect(
      redeemInvite({ code: "OLDCODE1", userId: u.id, userEmail: u.email })
    ).toEqual({ ok: false, reason: "not_found" });
  });

  it("updateInviteSettings changes one facet without disturbing others", () => {
    const holder = createUser();
    const crew = createCrew(holder.id, {
      inviteCode: "SETCODE1",
      inviteBoundEmail: "keep@me.test",
    });

    // SQLite timestamp mode stores whole unix seconds, so pin to a second.
    const expiresAt = new Date(Math.floor((Date.now() + HOUR) / 1000) * 1000);
    updateInviteSettings(crew.id, { expiresAt });

    const row = db.select().from(crews).where(eq(crews.id, crew.id)).get();
    expect(row?.inviteExpiresAt?.getTime()).toBe(expiresAt.getTime());
    // Email binding is untouched, and lower-cased on write only when set.
    expect(row?.inviteBoundEmail).toBe("keep@me.test");
  });
});
