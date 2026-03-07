// Single source of truth for notification event types
// Used by schema, types, service, and frontend

export const NOTIFICATION_EVENT_TYPES = [
  "task_created",
  "task_claimed",
  "task_completed",
  "task_assigned",
  "task_cancelled",
  "bid_placed",
  "auction_won",
  "milestone_logged",
  "badge_earned",
  "member_joined",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_CHANNELS = [
  "in_app",
  "email",
  "push",
  "sms",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "failed",
  "read",
] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

// Default channel preferences (applied when no row exists)
export const DEFAULT_CHANNEL_PREFERENCES = {
  in_app: true,
  email: true,
  push: true,
  sms: false,
} as const;

// Default per-event preferences (all enabled by default)
export const DEFAULT_EVENT_PREFERENCES: Record<NotificationEventType, boolean> =
  {
    task_created: true,
    task_claimed: true,
    task_completed: true,
    task_assigned: true,
    task_cancelled: true,
    bid_placed: true,
    auction_won: true,
    milestone_logged: true,
    badge_earned: true,
    member_joined: true,
  };
