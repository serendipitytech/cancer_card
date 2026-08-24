import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { handleSignIn, signOut } from "@logto/next/server-actions";
import { logtoConfig } from "@/lib/logto";
import { provisionAppUser } from "@/lib/logto-user";

// GET /callback — Logto redirects here after sign-in. Complete the flow (which
// sets the session cookie), link/create the app user, then land on the app.
//
// `handleSignIn` and `provisionAppUser` can both fail AFTER the Logto cookie
// is already set (e.g. an unverified-email refusal in provisionAppUser, or a
// DB hiccup). Left unhandled, that strands the visitor with a live Logto
// session but no app user row: every subsequent page bounces them back
// through `auth()` returning null, which redirects to sign-in, which is
// already "signed in" at Logto, which redirects straight back here — an
// infinite loop only escapable by manually hitting /sign-out. We catch that
// here instead: clear the half-finished Logto session ourselves and send the
// visitor to a plain-language retry page rather than a raw 500.
export async function GET(request: NextRequest) {
  try {
    await handleSignIn(logtoConfig, request.nextUrl.searchParams);
    await provisionAppUser();
  } catch (err) {
    console.error("Sign-in callback failed after Logto session was set:", err);

    // `signOut` ends by calling `redirect(...)` from `next/navigation`,
    // which signals Next by THROWING. That throw is deliberately left
    // uncaught here (never wrap `redirect()` in try/catch) so it propagates
    // and actually performs the redirect: clear the half-finished Logto
    // session, then land the visitor on the plain-language retry page
    // instead of bouncing them right back into the loop we are escaping.
    await signOut(logtoConfig, `${process.env.LOGTO_BASE_URL ?? ""}/sign-in-error`);
  }

  redirect("/dashboard");
}
