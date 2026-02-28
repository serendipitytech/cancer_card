import { z } from "zod";
import { NOTIFICATION_EVENT_TYPES, NOTIFICATION_STATUSES } from "@/lib/notification-types";

// ─── Event Preferences (dynamic from source of truth) ───────────────────────

const eventPreferencesShape = Object.fromEntries(
  NOTIFICATION_EVENT_TYPES.map((event) => [event, z.boolean().optional()])
) as Record<(typeof NOTIFICATION_EVENT_TYPES)[number], z.ZodOptional<z.ZodBoolean>>;

const eventPreferencesSchema = z.object(eventPreferencesShape);

// ─── Update Preferences ─────────────────────────────────────────────────────

export const updatePreferencesSchema = z.object({
  channels: z
    .object({
      in_app: z.boolean().optional(),
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    })
    .optional(),
  eventPreferences: eventPreferencesSchema.optional(),
  quietHours: z
    .object({
      enabled: z.boolean(),
      start: z.number().int().min(0).max(23),
      end: z.number().int().min(0).max(23),
    })
    .optional(),
  digest: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(["daily", "weekly"]),
    })
    .optional(),
});

// ─── Mark Read ──────────────────────────────────────────────────────────────

export const markReadSchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }),
  z.object({ all: z.literal(true) }),
]);

// ─── Register Push Token ────────────────────────────────────────────────────

export const registerPushTokenSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  authKey: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});

// ─── Notification List Query ────────────────────────────────────────────────

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  status: z.enum(NOTIFICATION_STATUSES).optional(),
});
