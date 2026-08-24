import "server-only";

/**
 * Minimal Logto Management API client, used to delete a user's identity when
 * they close their account.
 *
 * Auth is the client-credentials (M2M) grant against the Troy-provisioned
 * credential in the vault (LOGTO_MGMT_APP_ID / LOGTO_MGMT_APP_SECRET). We never
 * self-authorize off the built-in `m-default` secret. See LOGTO-MIGRATION-PLAN.md.
 */

const endpoint = process.env.LOGTO_ENDPOINT;
const appId = process.env.LOGTO_MGMT_APP_ID;
const appSecret = process.env.LOGTO_MGMT_APP_SECRET;

// The Logto Management API resource indicator (default tenant).
const MGMT_RESOURCE = "https://default.logto.app/api";

async function getManagementToken(): Promise<string> {
  if (!endpoint || !appId || !appSecret) {
    throw new Error("Logto Management API credentials are not configured");
  }

  const res = await fetch(`${endpoint}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      resource: MGMT_RESOURCE,
      scope: "all",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Logto token request failed: ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Logto token response missing access_token");
  }
  return data.access_token;
}

/**
 * Delete a user from Logto by their id (the OIDC `sub`). A 404 is treated as
 * success (already gone).
 */
export async function deleteLogtoUser(logtoId: string): Promise<void> {
  const token = await getManagementToken();

  const res = await fetch(`${endpoint}/api/users/${encodeURIComponent(logtoId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Logto user deletion failed: ${res.status}`);
  }
}
