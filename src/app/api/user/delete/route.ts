import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSession, getUserCrews } from "@/lib/session";
import { notifyOnEvent } from "@/lib/notification-service";
import { deleteLogtoUser } from "@/lib/logto-mgmt";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/user/delete — close the current user's account.
 *
 * Model (Troy's decision): ANONYMIZE, do not cascade-delete. We scrub the
 * user's personal information but keep the row so crew and activity history stay
 * intact for the people they supported. Crews the user was the Card Holder of
 * are notified, with an offer to close their own account too. Finally the
 * identity is removed from Logto.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    const logtoId = session.user.logtoId;

    const { allowed } = checkRateLimit("delete-account", userId, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a bit and try again." },
        { status: 429 }
      );
    }

    // Notify crews where this user is the Card Holder, before anonymizing.
    for (const crew of getUserCrews(userId)) {
      if (crew.cardHolderId === userId) {
        notifyOnEvent(crew.crewId, "card_holder_left", userId, {});
      }
    }

    // Anonymize: scrub PII, keep the row so shared history survives. The unique
    // placeholder email satisfies the NOT NULL + UNIQUE constraints; userId is
    // an internal identifier, not personal data.
    db.update(users)
      .set({
        displayName: "A former member",
        email: `deleted-${userId}@deleted.invalid`,
        avatarUrl: null,
        logtoId: null,
        passwordHash: null,
      })
      .where(eq(users.id, userId))
      .run();

    // Remove the identity from Logto. Best-effort: the app row is already
    // anonymized, so a Logto hiccup should not fail the user's request.
    if (logtoId) {
      try {
        await deleteLogtoUser(logtoId);
      } catch (err) {
        console.error("Logto user deletion failed (app row already anonymized):", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return NextResponse.json(
      { error: "We couldn't complete the deletion. Please try again, or contact us." },
      { status: 500 }
    );
  }
}
