import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { handleSignIn } from "@logto/next/server-actions";
import { logtoConfig } from "@/lib/logto";
import { provisionAppUser } from "@/lib/logto-user";

// GET /callback — Logto redirects here after sign-in. Complete the flow (which
// sets the session cookie), link/create the app user, then land on the app.
export async function GET(request: NextRequest) {
  await handleSignIn(logtoConfig, request.nextUrl.searchParams);
  await provisionAppUser();
  redirect("/dashboard");
}
