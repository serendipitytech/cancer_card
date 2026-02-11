import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM =
  process.env.EMAIL_FROM || "noreply@serendipitytechnology.com";

type SendInviteResult = { success: true } | { success: false; error: string };

export async function sendInviteEmail(
  recipientEmail: string,
  senderName: string,
  crewName: string,
  inviteCode: string
): Promise<SendInviteResult> {
  if (!resend) {
    return { success: false, error: "Email is not configured" };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://cancer-card.serendipitylabs.cloud";
  const signupUrl = `${appUrl}/signup`;

  try {
    const { error } = await resend.emails.send({
      from: `The Cancer Card <${EMAIL_FROM}>`,
      to: recipientEmail,
      subject: sanitizeHeader(
        `${senderName} invited you to join ${crewName} on The Cancer Card`
      ),
      html: buildInviteEmailHtml(senderName, crewName, inviteCode, signupUrl),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    return { success: false, error: message };
  }
}

export function buildInviteEmailHtml(
  senderName: string,
  crewName: string,
  inviteCode: string,
  signupUrl: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <!-- Purple Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7C3AED,#EC4899);padding:28px 24px;text-align:center">
            <p style="margin:0;font-size:28px">&#9824;&#65039;</p>
            <h1 style="margin:8px 0 0;color:#FFFFFF;font-size:22px;font-weight:800">The Cancer Card</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 24px">
            <p style="margin:0 0 16px;color:#1E1B2E;font-size:16px;line-height:1.5">
              <strong>${escapeHtml(senderName)}</strong> invited you to join their support crew
              <strong>&ldquo;${escapeHtml(crewName)}&rdquo;</strong> on The Cancer Card.
            </p>
            <!-- Invite Code Box -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="background:#F5F3FF;border-radius:12px;padding:20px;text-align:center">
                <p style="margin:0 0 4px;color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Your Invite Code</p>
                <p style="margin:0;font-family:'Courier New',monospace;font-size:32px;font-weight:700;color:#7C3AED;letter-spacing:0.2em">${escapeHtml(inviteCode)}</p>
              </td></tr>
            </table>
            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
              <tr><td style="padding:6px 0;color:#4B5563;font-size:14px;line-height:1.5">
                <strong style="color:#7C3AED">1.</strong> Create an account at The Cancer Card
              </td></tr>
              <tr><td style="padding:6px 0;color:#4B5563;font-size:14px;line-height:1.5">
                <strong style="color:#7C3AED">2.</strong> Choose &ldquo;I&rsquo;m the Support&rdquo; when prompted
              </td></tr>
              <tr><td style="padding:6px 0;color:#4B5563;font-size:14px;line-height:1.5">
                <strong style="color:#7C3AED">3.</strong> Enter the code above to join the crew
              </td></tr>
            </table>
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
              <tr><td align="center">
                <a href="${escapeHtml(signupUrl)}" style="display:inline-block;background:#7C3AED;color:#FFFFFF;font-size:16px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none">
                  Sign Up Now
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #F3F4F6">
            <p style="margin:0;color:#9CA3AF;font-size:12px">
              The Cancer Card &mdash; gamifying the ask for help during treatment.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function sanitizeHeader(str: string): string {
  return str.replace(/[\r\n\x00-\x1F\x7F]/g, "");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
