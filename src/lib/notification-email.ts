import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM =
  process.env.EMAIL_FROM || "noreply@serendipitytechnology.com";

type EmailResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

export async function sendNotificationEmail(
  toEmail: string,
  title: string,
  body: string
): Promise<EmailResult> {
  if (!resend) {
    return { success: false, error: "Email is not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `The Cancer Card <${EMAIL_FROM}>`,
      to: toEmail,
      subject: sanitizeHeader(title),
      html: buildNotificationEmailHtml(title, body),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, externalId: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send email";
    return { success: false, error: message };
  }
}

function buildNotificationEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <tr>
          <td style="background:linear-gradient(135deg,#7C3AED,#EC4899);padding:28px 24px;text-align:center">
            <p style="margin:0;font-size:28px">&#9824;&#65039;</p>
            <h1 style="margin:8px 0 0;color:#FFFFFF;font-size:22px;font-weight:800">The Cancer Card</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px">
            <h2 style="margin:0 0 12px;color:#1E1B2E;font-size:18px;font-weight:700">${escapeHtml(title)}</h2>
            <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6">${escapeHtml(body)}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${escapeHtml(getAppUrl())}" style="display:inline-block;background:#7C3AED;color:#FFFFFF;font-size:16px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none">
                  Open The Cancer Card
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
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

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://cancer-card.serendipitylabs.cloud"
  );
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
