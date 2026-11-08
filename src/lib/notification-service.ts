import { db } from "@/db";
import { crewMembers, crews, users } from "@/db/schema";
import { eq, and, ne, isNull } from "drizzle-orm";
import type { NotificationEventType, NotificationChannel } from "@/lib/notification-types";
import {
  getOrCreatePreferences,
  insertNotificationBatch,
} from "@/lib/notification-queries";
import {
  getNotificationTemplate,
  renderActorText,
} from "@/lib/notifications";
import { ANONYMIZED_DISPLAY_NAME } from "@/lib/account-deletion";
import { sendNotificationEmail } from "@/lib/notification-email";
import { localHour, resolveTimezone } from "@/lib/time";

type EventData = Record<string, unknown>;

/**
 * Resolve the actor's CURRENT display name. Names are never frozen into the
 * notification log; we store `actorId` and look the name up at send/read time,
 * so a closed account renders as a former member everywhere.
 */
function resolveActorName(actorId: string): string {
  const actor = db
    .select({ displayName: users.displayName, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, actorId))
    .get();

  if (!actor) return "Someone";
  if (actor.deletedAt) return ANONYMIZED_DISPLAY_NAME;
  return actor.displayName || "Someone";
}

/**
 * Strip any denormalized name off the event payload and pin the actor's id, so
 * the persisted `data` blob carries references, not a person's name.
 */
function buildStoredData(actorId: string, data: EventData): EventData {
  const rest = { ...data };
  delete rest.actorName;
  return { ...rest, actorId };
}

// ─── Entry Point (fire-and-forget) ──────────────────────────────────────────

export function notifyOnEvent(
  crewId: string,
  eventType: NotificationEventType,
  actorId: string,
  data: EventData
): void {
  // Fire-and-forget — don't block the caller
  processEvent(crewId, eventType, actorId, data).catch((err) => {
    console.error("Notification processing failed:", err);
  });
}

async function processEvent(
  crewId: string,
  eventType: NotificationEventType,
  actorId: string,
  data: EventData
): Promise<void> {
  const recipientIds = getRecipients(crewId, eventType, actorId, data);
  if (recipientIds.length === 0) return;

  // Template text carries the ACTOR_PLACEHOLDER token, never a real name.
  const template = getNotificationTemplate(eventType, data);
  if (!template) return;

  // What we persist: the placeholdered template + a payload that references the
  // actor by id with no denormalized name. The live name is resolved only for
  // the transient email send below.
  const storedData = buildStoredData(actorId, data);
  const actorName = resolveActorName(actorId);

  // Filter recipients by their preferences for in-app delivery
  const inAppRecipients = recipientIds.filter((userId) => {
    const channels = resolveChannels(userId, crewId, eventType);
    return channels.includes("in_app");
  });

  if (inAppRecipients.length > 0) {
    const inAppEntries = inAppRecipients.map((userId) => ({
      userId,
      crewId,
      eventType,
      channel: "in_app" as NotificationChannel,
      title: template.title,
      body: template.body,
      data: storedData,
      status: "sent" as const,
      sentAt: new Date(),
    }));

    insertNotificationBatch(inAppEntries);
  }

  // Process email for each recipient (async, non-blocking)
  await Promise.all(
    recipientIds.map((userId) =>
      processEmailForUser(
        userId,
        crewId,
        eventType,
        template,
        storedData,
        actorName
      )
    )
  );
}

// ─── Recipient Routing ──────────────────────────────────────────────────────

function getRecipients(
  crewId: string,
  eventType: NotificationEventType,
  actorId: string,
  data: EventData
): string[] {
  switch (eventType) {
    case "task_created":
      return getTaskCreatedRecipients(crewId, actorId, data);
    case "task_claimed":
    case "task_completed":
    case "bid_placed":
      return getCardHolderIds(crewId);
    case "auction_won":
      return getAuctionWonRecipients(crewId, data);
    case "milestone_logged":
      return getCrewMemberIds(crewId, actorId);
    case "badge_earned":
      return data.userId ? [data.userId as string] : [];
    case "member_joined":
      return getCardHolderIds(crewId);
    case "card_holder_left":
      // Notify the remaining crew members (the leaving card holder is the actor).
      return getCrewMemberIds(crewId, actorId);
    default:
      return [];
  }
}

function getTaskCreatedRecipients(
  crewId: string,
  actorId: string,
  data: EventData
): string[] {
  const mode = data.mode as string;

  if (mode === "direct" && data.assignedTo) {
    return [data.assignedTo as string];
  }

  // open or auction — notify all crew members (not the card holder)
  return getCrewMemberIds(crewId, actorId);
}

function getAuctionWonRecipients(
  crewId: string,
  data: EventData
): string[] {
  const cardHolders = getCardHolderIds(crewId);
  const winnerId = data.winnerId as string | undefined;

  if (winnerId && !cardHolders.includes(winnerId)) {
    return [...cardHolders, winnerId];
  }

  return cardHolders;
}

function getCardHolderIds(crewId: string): string[] {
  // Join users and skip a closed (anonymized) card holder: routing must never
  // target an account that can no longer sign in to read it.
  const rows = db
    .select({ cardHolderId: crews.cardHolderId })
    .from(crews)
    .innerJoin(users, eq(users.id, crews.cardHolderId))
    .where(and(eq(crews.id, crewId), isNull(users.deletedAt)))
    .all();

  return rows.map((r) => r.cardHolderId);
}

function getCrewMemberIds(crewId: string, excludeUserId: string): string[] {
  return db
    .select({ userId: crewMembers.userId })
    .from(crewMembers)
    .innerJoin(users, eq(users.id, crewMembers.userId))
    .where(
      and(
        eq(crewMembers.crewId, crewId),
        ne(crewMembers.userId, excludeUserId),
        ne(crewMembers.role, "card_holder"),
        isNull(users.deletedAt)
      )
    )
    .all()
    .map((m) => m.userId);
}

// ─── Channel Resolution ────────────────────────────────────────────────────

async function processEmailForUser(
  userId: string,
  crewId: string,
  eventType: NotificationEventType,
  template: { title: string; body: string },
  storedData: EventData,
  actorName: string
): Promise<void> {
  const channels = resolveChannels(userId, crewId, eventType);
  if (!channels.includes("email")) return;

  const user = db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) return;

  // The sent email carries the live name; the logged copy keeps the placeholder
  // so no name is frozen into `notification_log`.
  const result = await sendNotificationEmail(
    user.email,
    renderActorText(template.title, actorName),
    renderActorText(template.body, actorName)
  );

  insertNotificationBatch([
    {
      userId,
      crewId,
      eventType,
      channel: "email",
      title: template.title,
      body: template.body,
      data: storedData,
      status: result.success ? "sent" : "failed",
      sentAt: result.success ? new Date() : undefined,
      failedAt: result.success ? undefined : new Date(),
      externalId: result.externalId,
      errorMessage: result.error,
    },
  ]);
}

function resolveChannels(
  userId: string,
  crewId: string,
  eventType: NotificationEventType
): NotificationChannel[] {
  const prefs = getOrCreatePreferences(userId, crewId);

  // Treat a missing preference (e.g. an event type added after this row was
  // created) as enabled; only an explicit false disables delivery. Without this
  // a brand-new event type would be silently suppressed for existing users.
  if (prefs.eventPreferences[eventType] === false) return [];

  // Quiet hours are in the recipient's local time, not server UTC.
  const userRow = db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const tz = resolveTimezone(userRow?.timezone);

  const channels: NotificationChannel[] = [];

  if (prefs.channels.in_app) channels.push("in_app");

  // Email/push respect quiet hours
  if (prefs.channels.email && !isInQuietHours(prefs.quietHours, tz)) {
    channels.push("email");
  }

  if (prefs.channels.push && !isInQuietHours(prefs.quietHours, tz)) {
    channels.push("push");
  }

  if (prefs.channels.sms) channels.push("sms");

  return channels;
}

function isInQuietHours(
  quietHours: {
    enabled: boolean;
    start: number;
    end: number;
  },
  tz: string
): boolean {
  if (!quietHours.enabled) return false;

  const hour = localHour(new Date(), tz);
  const { start, end } = quietHours;

  // Handle overnight ranges (e.g., 22-7)
  if (start > end) {
    return hour >= start || hour < end;
  }

  return hour >= start && hour < end;
}
