import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
  milestones,
  activityFeed,
  taskMenuTemplates,
  selfCareRoutines,
  notificationPreferences,
  notificationLog,
  pushTokens,
} from "@/db/schema";
import type { NotificationEventType as _NotifEventType } from "@/lib/notification-types";

export type {
  MemberStats,
  CrewSettings,
  AuctionSettings,
  ChannelPreferences,
  EventPreferences,
  QuietHours,
  DigestSettings,
} from "@/db/schema";
export type {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
} from "@/lib/notification-types";

// ─── Database Row Types ──────────────────────────────────────────────────────

export type User = InferSelectModel<typeof users>;
export type Crew = InferSelectModel<typeof crews>;
export type CrewMember = InferSelectModel<typeof crewMembers>;
export type Task = InferSelectModel<typeof tasks>;
export type Bid = InferSelectModel<typeof bids>;
export type Milestone = InferSelectModel<typeof milestones>;
export type ActivityFeedEntry = InferSelectModel<typeof activityFeed>;
export type TaskMenuTemplate = InferSelectModel<typeof taskMenuTemplates>;
export type SelfCareRoutine = InferSelectModel<typeof selfCareRoutines>;
export type NotificationPreference = InferSelectModel<typeof notificationPreferences>;
export type NotificationLogEntry = InferSelectModel<typeof notificationLog>;
export type PushToken = InferSelectModel<typeof pushTokens>;

// ─── Role Types ──────────────────────────────────────────────────────────────

export type UserRole = "card_holder" | "admin" | "crew_member";
export type TaskStatus = "pending" | "claimed" | "in_progress" | "completed" | "cancelled";
export type RequestMode = "direct" | "open" | "auction";
export type Urgency = "whenever" | "today" | "asap";

export type FeedEventType = _NotifEventType;

// ─── Badge Definitions ───────────────────────────────────────────────────────

export type BadgeId =
  | "first_responder"
  | "taco_champion"
  | "midnight_hero"
  | "auction_shark"
  | "ride_or_die"
  | "floor_is_clean"
  | "seven_day_streak"
  | "the_og"
  | "penny_pincher";

export type BadgeDefinition = {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
};

// ─── Composite Types ─────────────────────────────────────────────────────────

export type TaskWithBids = Task & {
  bids: (Bid & { user: Pick<User, "id" | "displayName" | "avatarUrl"> })[];
};

export type CrewMemberWithUser = CrewMember & {
  user: Pick<User, "id" | "displayName" | "email" | "avatarUrl">;
};

export type FeedEntryWithActor = ActivityFeedEntry & {
  actor: Pick<User, "id" | "displayName" | "avatarUrl">;
};

// ─── Session Types ───────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};
