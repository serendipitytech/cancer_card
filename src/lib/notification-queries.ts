import { db } from "@/db";
import {
  notificationPreferences,
  notificationLog,
  pushTokens,
} from "@/db/schema";
import type {
  ChannelPreferences,
  EventPreferences,
  QuietHours,
  DigestSettings,
} from "@/db/schema";
import { eq, and, inArray, sql, desc, ne } from "drizzle-orm";
import {
  DEFAULT_CHANNEL_PREFERENCES,
  DEFAULT_EVENT_PREFERENCES,
} from "@/lib/notification-types";
import type {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
} from "@/lib/notification-types";

// ─── Preference Defaults ────────────────────────────────────────────────────

const DEFAULT_QUIET_HOURS: QuietHours = {
  start: 22,
  end: 7,
  enabled: false,
};

const DEFAULT_DIGEST: DigestSettings = {
  enabled: false,
  frequency: "daily",
};

// ─── Preferences ────────────────────────────────────────────────────────────

export function getOrCreatePreferences(userId: string, crewId: string) {
  const existing = db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.crewId, crewId)
      )
    )
    .get();

  if (existing) return existing;

  return db
    .insert(notificationPreferences)
    .values({
      userId,
      crewId,
      channels: { ...DEFAULT_CHANNEL_PREFERENCES },
      eventPreferences: { ...DEFAULT_EVENT_PREFERENCES },
      quietHours: { ...DEFAULT_QUIET_HOURS },
      digest: { ...DEFAULT_DIGEST },
    })
    .returning()
    .get();
}

type PreferenceUpdates = {
  channels?: Partial<ChannelPreferences>;
  eventPreferences?: Partial<EventPreferences>;
  quietHours?: QuietHours;
  digest?: DigestSettings;
};

export function updatePreferences(
  userId: string,
  crewId: string,
  updates: PreferenceUpdates
) {
  const current = getOrCreatePreferences(userId, crewId);

  const merged = {
    channels: updates.channels
      ? { ...current.channels, ...updates.channels }
      : current.channels,
    eventPreferences: updates.eventPreferences
      ? { ...current.eventPreferences, ...updates.eventPreferences }
      : current.eventPreferences,
    quietHours: updates.quietHours ?? current.quietHours,
    digest: updates.digest ?? current.digest,
  };

  return db
    .update(notificationPreferences)
    .set(merged)
    .where(eq(notificationPreferences.id, current.id))
    .returning()
    .get();
}

// ─── Notification Log Queries ───────────────────────────────────────────────

export function getUnreadCount(userId: string, crewId: string): number {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.crewId, crewId),
        eq(notificationLog.channel, "in_app"),
        ne(notificationLog.status, "read")
      )
    )
    .get();

  return result?.count ?? 0;
}

type ListOptions = {
  limit: number;
  offset: number;
  status?: NotificationStatus;
};

export function getUserNotifications(
  userId: string,
  crewId: string,
  { limit, offset, status }: ListOptions
) {
  const conditions = [
    eq(notificationLog.userId, userId),
    eq(notificationLog.crewId, crewId),
    eq(notificationLog.channel, "in_app"),
  ];

  if (status) {
    conditions.push(eq(notificationLog.status, status));
  }

  return db
    .select()
    .from(notificationLog)
    .where(and(...conditions))
    .orderBy(desc(notificationLog.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getNotificationTotal(
  userId: string,
  crewId: string,
  status?: NotificationStatus
): number {
  const conditions = [
    eq(notificationLog.userId, userId),
    eq(notificationLog.crewId, crewId),
    eq(notificationLog.channel, "in_app"),
  ];

  if (status) {
    conditions.push(eq(notificationLog.status, status));
  }

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(notificationLog)
    .where(and(...conditions))
    .get();

  return result?.count ?? 0;
}

export function markNotificationsRead(
  userId: string,
  crewId: string,
  ids: string[]
): number {
  const result = db
    .update(notificationLog)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.crewId, crewId),
        inArray(notificationLog.id, ids),
        ne(notificationLog.status, "read")
      )
    )
    .returning({ id: notificationLog.id })
    .all();

  return result.length;
}

export function markAllRead(userId: string, crewId: string): number {
  const result = db
    .update(notificationLog)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.crewId, crewId),
        eq(notificationLog.channel, "in_app"),
        ne(notificationLog.status, "read")
      )
    )
    .returning({ id: notificationLog.id })
    .all();

  return result.length;
}

// ─── Batch Insert ───────────────────────────────────────────────────────────

type NotificationInsert = {
  userId: string;
  crewId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status?: NotificationStatus;
  sentAt?: Date;
  externalId?: string;
  errorMessage?: string;
  failedAt?: Date;
};

export function insertNotificationBatch(entries: NotificationInsert[]) {
  if (entries.length === 0) return;

  db.insert(notificationLog).values(entries).run();
}

// ─── Push Tokens ────────────────────────────────────────────────────────────

type WebTokenData = {
  tokenType: "web";
  endpoint: string;
  p256dh: string;
  authKey: string;
  userAgent?: string;
};

type NativeTokenData = {
  tokenType: "apns" | "fcm";
  deviceToken: string;
  userAgent?: string;
};

type PushTokenData = WebTokenData | NativeTokenData;

export function registerPushToken(userId: string, data: PushTokenData) {
  if (data.tokenType === "web") {
    return db
      .insert(pushTokens)
      .values({
        userId,
        tokenType: "web",
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        authKey: data.authKey,
        userAgent: data.userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushTokens.endpoint,
        set: {
          userId,
          p256dh: data.p256dh,
          authKey: data.authKey,
          userAgent: data.userAgent ?? null,
        },
      })
      .returning()
      .get();
  }

  return db
    .insert(pushTokens)
    .values({
      userId,
      tokenType: data.tokenType,
      endpoint: `${data.tokenType}://${data.deviceToken}`,
      deviceToken: data.deviceToken,
      userAgent: data.userAgent ?? null,
    })
    .onConflictDoUpdate({
      target: pushTokens.deviceToken,
      set: { userId, userAgent: data.userAgent ?? null },
    })
    .returning()
    .get();
}

export function getUserPushTokens(userId: string) {
  return db
    .select()
    .from(pushTokens)
    .where(eq(pushTokens.userId, userId))
    .all();
}

export function removePushToken(userId: string, endpoint: string): boolean {
  const result = db
    .delete(pushTokens)
    .where(
      and(eq(pushTokens.userId, userId), eq(pushTokens.endpoint, endpoint))
    )
    .returning({ id: pushTokens.id })
    .all();

  return result.length > 0;
}
