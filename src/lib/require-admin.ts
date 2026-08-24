import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Re-verify the caller is an allow-listed admin.
 *
 * This is deliberately independent of `(admin)/layout.tsx`'s guard. A
 * layout-only check is not a safe perimeter for pages that read global PII:
 * Next.js can serve an individual route segment's render without every
 * ancestor layout re-running on every request path (partial
 * prerendering / RSC segment fetches / some prefetch flows), so relying on
 * the layout alone leaves a bypass window.
 *
 * Every admin page (and, for defense-in-depth, every admin-queries
 * function) calls this directly, in ADDITION to the layout check, not
 * instead of it. Redirects rather than throwing so it composes with the
 * rest of the page/layout tree the same way the layout's own guard does.
 */
export async function requireAdmin(): Promise<void> {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (
    ADMIN_EMAILS.length === 0 ||
    !ADMIN_EMAILS.includes(session.user.email?.toLowerCase() ?? "")
  ) {
    redirect("/dashboard");
  }
}
