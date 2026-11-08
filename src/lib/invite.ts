import { db } from "@/db";
import { crews, crewMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateInviteCode } from "@/lib/utils";

/**
 * Invite lifecycle (WP4).
 *
 * The crew invite code used to be a permanent, unrevocable 8-char bearer token:
 * anyone who ever saw it could join forever. This module turns that single code
 * into a managed lifecycle object. The code is still one-per-crew (so WP3's
 * deletion-time rotation and the existing share/email surfaces keep working),
 * but every redemption now runs through `redeemInvite`, which enforces expiry,
 * a max-use cap, explicit revocation, and optional email-binding.
 *
 * All validation lives in the pure `evaluateInvite` helper so it can be unit
 * tested without a database; `redeemInvite` wraps it in a single synchronous
 * better-sqlite3 transaction so the use-count increment is race-free.
 */

/** Why an invite code was refused. `ok` is the success case. */
export type InviteRejection =
  | "not_found"
  | "revoked"
  | "expired"
  | "exhausted"
  | "email_mismatch"
  | "already_member";

/** The lifecycle fields `evaluateInvite` reasons over. Pure, no DB. */
export type InviteState = {
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  revokedAt: Date | null;
  boundEmail: string | null;
};

export type InviteContext = {
  nowMs: number;
  /** The redeeming user's email, lower-cased by the caller or here. */
  email: string;
};

export type InviteEvaluation =
  | { ok: true }
  | { ok: false; reason: Exclude<InviteRejection, "not_found" | "already_member"> };

/**
 * Decide whether an invite in the given state may be redeemed right now by the
 * given email. Pure and total: same inputs, same answer, no side effects.
 *
 * Order matters for the message the user sees: a revoked code reports revoked
 * even if also expired, and an email mismatch is only surfaced once the code is
 * otherwise valid (so a wrong-email guess cannot distinguish a dead code).
 */
export function evaluateInvite(
  state: InviteState,
  ctx: InviteContext
): InviteEvaluation {
  if (state.revokedAt !== null) {
    return { ok: false, reason: "revoked" };
  }
  if (state.expiresAt !== null && ctx.nowMs > state.expiresAt.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (state.maxUses !== null && state.useCount >= state.maxUses) {
    return { ok: false, reason: "exhausted" };
  }
  if (
    state.boundEmail !== null &&
    state.boundEmail.toLowerCase() !== ctx.email.toLowerCase()
  ) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true };
}

export type RedeemInput = {
  code: string;
  userId: string;
  userEmail: string;
  nowMs?: number;
};

export type RedeemResult =
  | {
      ok: true;
      crew: { id: string; name: string; pointBalance: number };
    }
  | { ok: false; reason: InviteRejection };

/**
 * Validate `code` for `userId` and, if it passes, insert the crew membership
 * and increment the invite's use count, all in one transaction. Returns a
 * discriminated result the HTTP layer maps to a status code; side effects that
 * must live outside the DB (cookie, notifications, activity feed) stay in the
 * route.
 */
export function redeemInvite(input: RedeemInput): RedeemResult {
  const nowMs = input.nowMs ?? Date.now();
  const normalizedCode = input.code.trim().toUpperCase();

  return db.transaction((tx): RedeemResult => {
    const crew = tx
      .select()
      .from(crews)
      .where(eq(crews.inviteCode, normalizedCode))
      .get();

    if (!crew) {
      return { ok: false, reason: "not_found" };
    }

    const evaluation = evaluateInvite(
      {
        expiresAt: crew.inviteExpiresAt,
        maxUses: crew.inviteMaxUses,
        useCount: crew.inviteUseCount,
        revokedAt: crew.inviteRevokedAt,
        boundEmail: crew.inviteBoundEmail,
      },
      { nowMs, email: input.userEmail }
    );

    if (!evaluation.ok) {
      return { ok: false, reason: evaluation.reason };
    }

    const existing = tx
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(
        and(
          eq(crewMembers.crewId, crew.id),
          eq(crewMembers.userId, input.userId)
        )
      )
      .get();

    if (existing) {
      return { ok: false, reason: "already_member" };
    }

    tx.insert(crewMembers)
      .values({
        crewId: crew.id,
        userId: input.userId,
        role: "crew_member",
      })
      .run();

    tx.update(crews)
      .set({ inviteUseCount: sql`${crews.inviteUseCount} + 1` })
      .where(eq(crews.id, crew.id))
      .run();

    return {
      ok: true,
      crew: {
        id: crew.id,
        name: crew.name,
        pointBalance: crew.pointBalance,
      },
    };
  });
}

/** Fields an authorized crew member may set on their invite. */
export type InviteSettingsUpdate = {
  expiresAt?: Date | null;
  maxUses?: number | null;
  boundEmail?: string | null;
};

/**
 * Apply lifecycle settings to a crew's current invite code. Only the keys
 * present in `update` are changed, so a caller can set an expiry without
 * disturbing an existing email binding.
 */
export function updateInviteSettings(
  crewId: string,
  update: InviteSettingsUpdate
): void {
  const patch: Record<string, unknown> = {};
  if ("expiresAt" in update) patch.inviteExpiresAt = update.expiresAt ?? null;
  if ("maxUses" in update) patch.inviteMaxUses = update.maxUses ?? null;
  if ("boundEmail" in update) {
    patch.inviteBoundEmail = update.boundEmail
      ? update.boundEmail.toLowerCase()
      : null;
  }
  if (Object.keys(patch).length === 0) return;

  db.update(crews).set(patch).where(eq(crews.id, crewId)).run();
}

/**
 * Revoke a crew's invite code. The code stops granting access immediately; the
 * string is left in place so existing share/email copies resolve to a clear
 * "this invite was turned off" rather than a generic not-found.
 */
export function revokeInvite(crewId: string, nowMs?: number): void {
  db.update(crews)
    .set({ inviteRevokedAt: new Date(nowMs ?? Date.now()) })
    .where(eq(crews.id, crewId))
    .run();
}

/** Clean lifecycle state for a freshly minted code: active, unrestricted. */
export const FRESH_INVITE_LIFECYCLE = {
  inviteUseCount: 0,
  inviteRevokedAt: null,
  inviteExpiresAt: null,
  inviteMaxUses: null,
  inviteBoundEmail: null,
} as const;

/**
 * Rotate a crew's invite to a brand-new code and reset its lifecycle to the
 * clean active state. Used when a card holder wants to kill every outstanding
 * copy of the old code and start over. WP3's account-deletion path performs the
 * equivalent reset inline inside its scrub transaction.
 */
export function rotateInvite(crewId: string): string {
  const code = generateInviteCode();
  db.update(crews)
    .set({ inviteCode: code, ...FRESH_INVITE_LIFECYCLE })
    .where(eq(crews.id, crewId))
    .run();
  return code;
}
