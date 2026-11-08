import { vi, beforeEach } from "vitest";
import { webcrypto } from "node:crypto";
import type { TestAuthState } from "./helpers/auth-state";

// Node 18's test runtime does not expose a global `crypto`, but the schema's
// id defaults call `crypto.randomUUID()` (available in the Next.js runtime and
// Node 20+). Shim it for the test environment only.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// ─── Mutable auth state shared with the mocked auth/cookie modules ────────────
// Stored on globalThis so the hoisted `vi.mock` factories below can read it
// without running into hoisting-order problems. `tests/helpers/harness.ts`
// provides typed setters (setSession / clearSession / setActiveCrew).
const authState: TestAuthState = { session: null, activeCrewId: null };
(globalThis as unknown as { __ccAuthState: TestAuthState }).__ccAuthState =
  authState;

// Replace Auth.js with a controllable fake session. The route handlers only ever
// call `auth()`, so faking that one function is enough to simulate an
// authenticated user. When the Logto migration lands, this mock target is the
// single thing that changes.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => {
    return (globalThis as unknown as { __ccAuthState: TestAuthState })
      .__ccAuthState.session;
  }),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// `next/headers` cookies() is unavailable outside a request scope, so the cookie
// helper is faked. Returning null makes `resolveActiveCrew` fall back to the
// user's first crew; setActiveCrew() lets a test pick a specific crew.
vi.mock("@/lib/cookies", () => ({
  ACTIVE_CREW_COOKIE_NAME: "cc_active_crew",
  getActiveCrewCookie: vi.fn(async () => {
    return (globalThis as unknown as { __ccAuthState: TestAuthState })
      .__ccAuthState.activeCrewId;
  }),
  setActiveCrewCookie: vi.fn(async () => {}),
}));

// Notifications are fire-and-forget and reach out to Resend. Stub the entry
// point so tests never touch the network and never log async noise. The
// notification routing itself is out of scope for WP2.
vi.mock("@/lib/notification-service", () => ({
  notifyOnEvent: vi.fn(),
}));

// ─── Per-test isolation ───────────────────────────────────────────────────────
beforeEach(async () => {
  const { resetDb } = await import("./helpers/test-db");
  await resetDb();
  authState.session = null;
  authState.activeCrewId = null;
  vi.clearAllMocks();
});
