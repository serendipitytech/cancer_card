import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { notifyOnEvent } from "@/lib/notification-service";
import { anonymizeUserData } from "@/lib/account-deletion";
import { deleteLogtoUser } from "@/lib/logto-mgmt";
import { checkRateLimit } from "@/lib/rate-limit";
import { alertOps } from "@/lib/ops-alert";

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
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    // Anonymize + scrub every name/PII/free-text surface in one transaction.
    // Returns the crews this user card-held (snapshotted before the scrub) so
    // we can notify them. If the transaction throws, nothing is committed and
    // no notification fires below.
    const { cardHeldCrewIds } = anonymizeUserData(userId);

    // Notify the affected crews only AFTER the anonymize transaction is
    // committed, so a crew never gets a "card holder left" notice for a
    // deletion that didn't actually happen.
    for (const crewId of cardHeldCrewIds) {
      notifyOnEvent(crewId, "card_holder_left", userId, {});
    }

    // Remove the identity from Logto. Best-effort: the app row is already
    // anonymized, so a Logto hiccup should not fail the user's request. But a
    // silent failure here leaves a real email address live at Logto after the
    // user asked us to delete their account, so it needs a human to follow up
    // on, not just a log line.
    if (logtoId) {
      try {
        await deleteLogtoUser(logtoId);
      } catch (err) {
        console.error(
          `Logto user deletion failed for logtoId=${logtoId} (app row already anonymized; orphaned PII remains at Logto):`,
          err
        );
        await alertOps(
          `Cancer Card: Logto account deletion failed for logtoId ${logtoId} after the app row was anonymized. The real email is still live at Logto and needs manual cleanup.`
        );
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
