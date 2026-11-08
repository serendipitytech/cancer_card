import { db } from "@/db";
import {
  notificationPreferences,
  notificationLog,
  pushTokens,
  users,
} from "@/db/schema";
import type {
  ChannelPreferences,
  EventPreferences,
  QuietHours,
  DigestSettings,
} from "@/db/schema";
import { eq, and, inArray, sql, desc, ne } from "drizzle-orm";
import { renderActorText } from "@/lib/notifications";
import { ANONYMIZED_DISPLAY_NAME } from "@/lib/account-deletion";
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

// ─── Read-time name rendering ────────────────────────────────────────────────

type RenderableRow = {
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

/**
 * Resolve the ACTOR_PLACEHOLDER in stored notification text to the actor's
 * CURRENT display name. Names are never frozen into the log; the row stores
 * `data.actorId`, and this is where the live name is stitched in at read time,
 * so a closed account shows "A former member" without any row rewrite.
 */
export function hydrateNotifications<T extends RenderableRow>(rows: T[]): T[] {
  const actorIds = Array.from(
    new Set(
      rows
        .map((r) => (r.data?.actorId as string | undefined) ?? null)
        .filter((id): id is string => Boolean(id))
    )
  );

  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const actors = db
      .select({
        id: users.id,
        displayName: users.displayName,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(inArray(users.id, actorIds))
      .all();
    for (const a of actors) {
      nameById.set(a.id, a.deletedAt ? ANONYMIZED_DISPLAY_NAME : a.displayName);
    }
  }

  return rows.map((row) => {
    const actorId = row.data?.actorId as string | undefined;
    const name = (actorId && nameById.get(actorId)) || "Someone";
    return { ...row, title: renderActorText(row.title, name), body: renderActorText(row.body, name) };
  });
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

  const rows = db
    .select()
    .from(notificationLog)
    .where(and(...conditions))
    .orderBy(desc(notificationLog.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return hydrateNotifications(rows);
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
