import { cache } from "react";
import { getLogtoContext } from "@logto/next/server-actions";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logtoConfig } from "@/lib/logto";

/**
 * App session, backed by Logto.
 *
 * The shape is intentionally kept compatible with the previous Auth.js `auth()`
 * so the existing call sites (all read `session.user.id`) keep working without
 * change. Logto owns identity now; we map the Logto `sub` to our own users row.
 * See LOGTO-MIGRATION-PLAN.md.
 */
export type AppSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    logtoId: string;
  };
};

/**
 * Resolve the current session from the Logto context, or null.
 *
 * Read-only and safe in Server Components, Route Handlers, and Server Actions.
 * We only read identity claims (no resource/access-token refresh), so there is
 * no cookie write on this path. Memoized per request via React cache() so the
 * many call sites in a single render share one context read.
 */
export const auth = cache(async (): Promise<AppSession | null> => {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated || !claims?.sub) {
    return null;
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.logtoId, claims.sub))
    .get();

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.displayName,
      image: user.avatarUrl,
      logtoId: claims.sub,
    },
  };
});
