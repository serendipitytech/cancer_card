import type { LogtoNextConfig } from "@logto/next";
import { UserScope } from "@logto/next";

/**
 * Logto configuration for The Cancer Card.
 *
 * We integrate against Logto's HOSTED, per-app-branded sign-in experience (the
 * house approach, decided with the Logto owner). The app redirects out to
 * `auth.serendipitylabs.cloud` for sign-in and back to /callback. Adding a
 * connector later (Google, Apple, SMS) is a Logto-console change with no app
 * deploy. See LOGTO-MIGRATION-PLAN.md.
 *
 * Values come from the environment (docker-compose passes them from the
 * gitignored .env, sourced from the pass vault). We read them with a fallback
 * rather than throwing at module load: this module is imported during
 * `next build` (page-data collection), where the env is intentionally absent,
 * and Next reads server env at runtime in the standalone output. The env is
 * present at runtime via compose; a missing value surfaces as a clear Logto
 * error on the first sign-in, not a build failure.
 */
export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT ?? "",
  appId: process.env.LOGTO_APP_ID ?? "",
  appSecret: process.env.LOGTO_APP_SECRET ?? "",
  baseUrl: process.env.LOGTO_BASE_URL ?? "",
  cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? "",
  cookieSecure: process.env.NODE_ENV === "production",
  // Email is required so we can link the existing users (and provision new
  // ones) by their verified address; profile gives us name and avatar.
  scopes: [UserScope.Email, UserScope.Profile],
};

/** Route the app redirects to after a successful sign-in. */
export const signInCallbackUri = `${process.env.LOGTO_BASE_URL ?? ""}/callback`;
