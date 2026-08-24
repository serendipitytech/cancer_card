import { signIn } from "@logto/next/server-actions";
import { logtoConfig, signInCallbackUri } from "@/lib/logto";

// GET /sign-in — kick off the Logto hosted sign-in flow. Redirects to
// auth.serendipitylabs.cloud and back to /callback.
export async function GET() {
  await signIn(logtoConfig, { redirectUri: signInCallbackUri });
}
