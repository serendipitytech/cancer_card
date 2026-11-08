import { db } from "@/db";
import { crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Crew membership removal (WP4).
 *
 * Two closely related actions: an authorized crew role removing someone else,
 * and a member leaving on their own. Both end in the same place: the person's
 * `crew_members` row is deleted. Because every access check in the app is gated
 * on a live `crew_members` row (see `getUserCrews`, the task-route membership
 * checks), deleting that row ends access immediately, with no token to revoke
 * or session to expire.
 *
 * The card holder is the anchor of the crew and cannot be removed or leave:
 * doing so would orphan the crew (and the points balance / history attached to
 * it). Closing the account is the separate, deliberate path for that, handled
 * by the account-deletion scrub.
 */

export type RemoveMemberReason =
  | "not_a_member" // the acting user is not in this crew
  | "target_not_member" // the target is not in this crew
  | "forbidden" // acting user lacks the role to remove someone else
  | "cannot_remove_card_holder"; // the card holder cannot be removed/leave

export type RemoveMemberResult =
  | { ok: true; selfLeave: boolean }
  | { ok: false; reason: RemoveMemberReason };

type Membership = { role: string };

function membershipOf(crewId: string, userId: string): Membership | undefined {
  return db
    .select({ role: crewMembers.role })
    .from(crewMembers)
    .where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.userId, userId)))
    .get();
}

/**
 * Remove `targetUserId` from `crewId`, acting as `actingUserId`.
 *
 * - Self-leave: target === acting. Any non-card-holder member may leave.
 * - Removal: target !== acting. Only a `card_holder` or `admin` may remove
 *   another member, and the card holder can never be removed.
 *
 * Returns a discriminated result; the HTTP layer maps the reason to a status.
 */
export function removeMember(
  crewId: string,
  actingUserId: string,
  targetUserId: string
): RemoveMemberResult {
  const acting = membershipOf(crewId, actingUserId);
  if (!acting) {
    return { ok: false, reason: "not_a_member" };
  }

  const selfLeave = actingUserId === targetUserId;

  if (selfLeave) {
    if (acting.role === "card_holder") {
      return { ok: false, reason: "cannot_remove_card_holder" };
    }
  } else {
    if (acting.role !== "card_holder" && acting.role !== "admin") {
      return { ok: false, reason: "forbidden" };
    }
    const target = membershipOf(crewId, targetUserId);
    if (!target) {
      return { ok: false, reason: "target_not_member" };
    }
    if (target.role === "card_holder") {
      return { ok: false, reason: "cannot_remove_card_holder" };
    }
  }

  db.delete(crewMembers)
    .where(
      and(
        eq(crewMembers.crewId, crewId),
        eq(crewMembers.userId, targetUserId)
      )
    )
    .run();

  return { ok: true, selfLeave };
}
