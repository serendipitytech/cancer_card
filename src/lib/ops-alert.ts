import "server-only";

/**
 * Minimal ops-alert primitive for events that need a human, not just a log
 * line, matching the pattern established in mbs-platform's `ops_alerts.py`.
 *
 * This container is isolated from the host (no mount of
 * `/docker/scripts/notify.sh` or the `pass` vault), so it cannot shell out to
 * the org-wide notify.sh script directly. Instead it posts to the same
 * Telegram bot/chat via the plain Bot API, configured entirely by env:
 * `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`. Silently skipped (after a
 * console.error so forensics still work) when either is unset, so this is
 * safe to call from day one without any deploy/env change.
 *
 * Never throws: an alert-delivery failure must never fail the caller's own
 * request.
 */
export async function alertOps(message: string): Promise<void> {
  // Always logged, gated or not: log-based forensics keep working even when
  // Telegram delivery is off or misconfigured.
  console.error(`[ALERT] ${message}`);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;

  if (!token || !chatId) {
    return;
  }

  const env = process.env.NODE_ENV === "production" ? "prod" : "dev";

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `[${env}] Cancer Card: ${message}`,
      }),
      cache: "no-store",
    });
  } catch (err) {
    // Delivery failure only, the [ALERT] log line above already captured it.
    console.error("alertOps: Telegram delivery failed:", err);
  }
}
