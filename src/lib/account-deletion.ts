import { db } from "@/db";
import {
  users,
  crews,
  bids,
  milestones,
  pushTokens,
  notificationLog,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateInviteCode } from "@/lib/utils";
import { FRESH_INVITE_LIFECYCLE } from "@/lib/invite";

/**
 * Account deletion = anonymize, not cascade (Troy's decision). We keep the
 * user row and their contributions so the crews they supported stay intact,
 * but every piece of personal text about them is scrubbed from every table that
 * holds it, and the row is marked closed so nothing routes to it again.
 *
 * This module is the single, testable home for that scrub. The HTTP route is a
 * thin wrapper that calls `anonymizeUserData`, then handles the side effects
 * that must live outside the DB transaction (crew notifications, Logto).
 */

/** What an anonymized person's name renders as everywhere it is resolved. */
export const ANONYMIZED_DISPLAY_NAME = "A former member";

/** Neutral crew name once the card holder closes their account. */
export const ANONYMIZED_CREW_NAME = "A former member's crew";

export type AnonymizeResult = {
  /** Crews this user was the Card Holder of, captured before the scrub. */
  cardHeldCrewIds: string[];
};

/**
 * Scrub every name/PII/free-text surface for `userId` in one transaction.
 * Returns the crews the user card-held (snapshotted before the scrub) so the
 * caller can notify them.
 */
export function anonymizeUserData(userId: string): AnonymizeResult {
  return db.transaction((tx): AnonymizeResult => {
    // Snapshot card-held crews BEFORE scrubbing: once the crew name/invite code
    // are rewritten we can still find them by cardHolderId, but we capture here
    // for clarity and to drive notifications.
    const cardHeldCrews = tx
      .select({ id: crews.id })
      .from(crews)
      .where(eq(crews.cardHolderId, userId))
      .all();

    // 1. The user row: scrub PII, keep the row, mark it closed. The unique
    // placeholder email satisfies NOT NULL + UNIQUE; userId is internal.
    tx.update(users)
      .set({
        displayName: ANONYMIZED_DISPLAY_NAME,
        email: `deleted-${userId}@deleted.invalid`,
        avatarUrl: null,
        logtoId: null,
        deletedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .run();

    // 2. Crews the user card-held: a crew name often embeds the patient's name
    // ("Jane's chemo crew"), and the invite code is a bearer token. Neutralize
    // the name and rotate the code so it stops granting access. Reset the WP4
    // invite lifecycle to a clean active state so the fresh code is not left
    // carrying a stale revoked/expired/bound flag from before deletion.
    for (const crew of cardHeldCrews) {
      tx.update(crews)
        .set({
          name: ANONYMIZED_CREW_NAME,
          inviteCode: generateInviteCode(),
          ...FRESH_INVITE_LIFECYCLE,
        })
        .where(eq(crews.id, crew.id))
        .run();
    }

    // 3. Push tokens are device identifiers + secrets: delete outright.
    tx.delete(pushTokens).where(eq(pushTokens.userId, userId)).run();

    // 4. Free text the user authored can restate their name or health context,
    // and cannot be selectively redacted, so null it entirely.
    tx.update(bids).set({ comment: null }).where(eq(bids.userId, userId)).run();
    tx.update(milestones)
      .set({ note: null })
      .where(eq(milestones.userId, userId))
      .run();

    // 5. Notification log. The user's own inbox is personal data: delete it.
    tx.delete(notificationLog)
      .where(eq(notificationLog.userId, userId))
      .run();

    // Notifications ABOUT the user (sent to others) store the ACTOR_PLACEHOLDER
    // in title/body and reference the actor by id, so they resolve to "A former
    // member" at read time with no frozen name. Defense in depth for any legacy
    // row that still carried a denormalized name: drop the actorName key.
    tx.update(notificationLog)
      .set({ data: sql`json_remove(${notificationLog.data}, '$.actorName')` })
      .where(
        sql`${notificationLog.data} IS NOT NULL AND json_extract(${notificationLog.data}, '$.actorId') = ${userId}`
      )
      .run();

    return { cardHeldCrewIds: cardHeldCrews.map((c) => c.id) };
  });
}
