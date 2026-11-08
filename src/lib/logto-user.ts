import { getLogtoContext } from "@logto/next/server-actions";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logtoConfig } from "@/lib/logto";

/**
 * Link a Logto identity to an app users row, called right after a successful
 * sign-in callback.
 *
 *  - Already linked (logto_id matches): no-op.
 *  - A pre-Logto row exists for the VERIFIED email (the 9 migrated users):
 *    stamp its logto_id.
 *  - Otherwise: create a new app user row (Logto owns credentials now; the app
 *    stores no password).
 *
 * Security: ALL email-based provisioning, both linking to an existing row
 * and creating a new one, requires a verified email. An unverified email
 * that collides with an existing account is refused, so a fresh Logto
 * signup cannot claim someone else's crew data by typing their address.
 * An unverified email is also refused on the create path, so no one can
 * stand up a brand-new account (and later claim it, or have someone
 * impersonate them by pre-registering their address) before ever proving
 * they own that inbox.
 */
export async function provisionAppUser(): Promise<void> {
  const { isAuthenticated, claims, userInfo } = await getLogtoContext(logtoConfig, {
    fetchUserInfo: true,
  });

  if (!isAuthenticated || !claims?.sub) {
    throw new Error("provisionAppUser called without an authenticated Logto session");
  }

  const logtoId = claims.sub;

  // Already linked, nothing to do.
  const linked = db.select().from(users).where(eq(users.logtoId, logtoId)).get();
  if (linked) {
    return;
  }

  const email = (userInfo?.email ?? claims.email)?.toLowerCase() ?? null;
  const emailVerified = Boolean(userInfo?.email_verified);
  const displayName = userInfo?.name ?? claims.name ?? email ?? "New member";
  const avatar = userInfo?.picture ?? claims.picture ?? null;

  if (!email) {
    throw new Error("Logto session has no email; cannot provision a Cancer Card user");
  }

  // Verified email is required for ANY email-based provisioning below, both
  // linking to an existing row and creating a new one. Refusing here (before
  // either branch) closes both the account-takeover vector (claiming an
  // existing user's row) and the impersonation/pre-claim-poisoning vector
  // (standing up a new row under an address the caller hasn't proven they
  // own).
  if (!emailVerified) {
    throw new Error(
      "Email is not verified; cannot provision a Cancer Card account for this address"
    );
  }

  const existingByEmail = db.select().from(users).where(eq(users.email, email)).get();
  if (existingByEmail) {
    db.update(users)
      .set({ logtoId, avatarUrl: existingByEmail.avatarUrl ?? avatar })
      .where(eq(users.id, existingByEmail.id))
      .run();
    return;
  }

  db.insert(users)
    .values({ email, displayName, avatarUrl: avatar, logtoId })
    .run();
}
