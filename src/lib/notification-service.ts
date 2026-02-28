import { db } from "@/db";
import { crewMembers, crews, users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import type { NotificationEventType, NotificationChannel } from "@/lib/notification-types";
import {
  getOrCreatePreferences,
  insertNotificationBatch,
} from "@/lib/notification-queries";
import { getNotificationTemplate } from "@/lib/notifications";
import { sendNotificationEmail } from "@/lib/notification-email";

type EventData = Record<string, unknown>;

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

  const template = getNotificationTemplate(eventType, data);
  if (!template) return;

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
      data,
      status: "sent" as const,
      sentAt: new Date(),
    }));

    insertNotificationBatch(inAppEntries);
  }

  // Process email for each recipient (async, non-blocking)
  await Promise.all(
    recipientIds.map((userId) =>
      processEmailForUser(userId, crewId, eventType, template, data)
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
  const crew = db
    .select({ cardHolderId: crews.cardHolderId })
    .from(crews)
    .where(eq(crews.id, crewId))
    .get();

  return crew ? [crew.cardHolderId] : [];
}

function getCrewMemberIds(crewId: string, excludeUserId: string): string[] {
  return db
    .select({ userId: crewMembers.userId })
    .from(crewMembers)
    .where(
      and(
        eq(crewMembers.crewId, crewId),
        ne(crewMembers.userId, excludeUserId),
        ne(crewMembers.role, "card_holder")
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
  data: EventData
): Promise<void> {
  const channels = resolveChannels(userId, crewId, eventType);
  if (!channels.includes("email")) return;

  const user = db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) return;

  const result = await sendNotificationEmail(
    user.email,
    template.title,
    template.body
  );

  // Log the email notification
  insertNotificationBatch([
    {
      userId,
      crewId,
      eventType,
      channel: "email",
      title: template.title,
      body: template.body,
      data,
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

  // Check if event is disabled
  if (!prefs.eventPreferences[eventType]) return [];

  const channels: NotificationChannel[] = [];

  if (prefs.channels.in_app) channels.push("in_app");

  // Email/push respect quiet hours
  if (prefs.channels.email && !isInQuietHours(prefs.quietHours)) {
    channels.push("email");
  }

  if (prefs.channels.push && !isInQuietHours(prefs.quietHours)) {
    channels.push("push");
  }

  if (prefs.channels.sms) channels.push("sms");

  return channels;
}

function isInQuietHours(quietHours: {
  enabled: boolean;
  start: number;
  end: number;
}): boolean {
  if (!quietHours.enabled) return false;

  const hour = new Date().getHours();
  const { start, end } = quietHours;

  // Handle overnight ranges (e.g., 22-7)
  if (start > end) {
    return hour >= start || hour < end;
  }

  return hour >= start && hour < end;
}
