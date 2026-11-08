import { vi, beforeEach } from "vitest";
import { webcrypto } from "node:crypto";

// Node 18's test runtime does not expose a global `crypto`, but the schema's id
// defaults and the invite-code generator call `crypto.randomUUID()` /
// `crypto.getRandomValues()`. Shim it for the test environment only.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// WP3 tests exercise the REAL notification service and the real account-deletion
// scrub (that is the thing under test), so neither is mocked. We only stub the
// genuinely external edges: the email sender (Resend), the Logto Management API,
// and the ops alerter, so tests never touch the network.
vi.mock("@/lib/notification-email", () => ({
  sendNotificationEmail: vi.fn(async () => ({
    success: true,
    externalId: "test-email-id",
  })),
}));

vi.mock("@/lib/logto-mgmt", () => ({
  deleteLogtoUser: vi.fn(async () => {}),
}));

vi.mock("@/lib/ops-alert", () => ({
  alertOps: vi.fn(async () => {}),
}));

// `next/headers` cookies() is unavailable outside a request scope; the cookie
// helper is faked so `resolveActiveCrew` falls back to the user's first crew.
vi.mock("@/lib/cookies", () => ({
  ACTIVE_CREW_COOKIE_NAME: "cc_active_crew",
  getActiveCrewCookie: vi.fn(async () => null),
  setActiveCrewCookie: vi.fn(async () => {}),
}));

beforeEach(async () => {
  const { resetDb } = await import("./helpers/test-db");
  await resetDb();
  vi.clearAllMocks();
});
