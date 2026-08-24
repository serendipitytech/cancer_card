import { signOut } from "@logto/next/server-actions";
import { logtoConfig } from "@/lib/logto";

// GET /sign-out — clear the Logto session and return to the app root.
export async function GET() {
  await signOut(logtoConfig, process.env.LOGTO_BASE_URL);
}
