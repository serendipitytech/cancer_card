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
 *  - Otherwise: create a new app user row (password_hash stays null, Logto owns
 *    credentials now).
 *
 * Security: we only link to an existing account when the Logto email is
 * verified. An unverified email that collides with an existing account is
 * refused, so a fresh Logto signup cannot claim someone else's crew data by
 * typing their address.
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

  if (email) {
    const existingByEmail = db.select().from(users).where(eq(users.email, email)).get();
    if (existingByEmail) {
      if (!emailVerified) {
        throw new Error(
          "Email is not verified; cannot link to the existing Cancer Card account for this address"
        );
      }
      db.update(users)
        .set({ logtoId, avatarUrl: existingByEmail.avatarUrl ?? avatar })
        .where(eq(users.id, existingByEmail.id))
        .run();
      return;
    }
  }

  if (!email) {
    throw new Error("Logto session has no email; cannot provision a Cancer Card user");
  }

  db.insert(users)
    .values({ email, displayName, avatarUrl: avatar, logtoId })
    .run();
}
