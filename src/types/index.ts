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
} from "@/db/schema";
export type { MemberStats, CrewSettings, AuctionSettings } from "@/db/schema";

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

// ─── Role Types ──────────────────────────────────────────────────────────────

export type UserRole = "card_holder" | "admin" | "crew_member";
export type TaskStatus = "pending" | "claimed" | "in_progress" | "completed" | "cancelled";
export type RequestMode = "direct" | "open" | "auction";
export type Urgency = "whenever" | "today" | "asap";

export type FeedEventType =
  | "task_created"
  | "task_claimed"
  | "task_completed"
  | "bid_placed"
  | "auction_won"
  | "milestone_logged"
  | "badge_earned"
  | "member_joined";

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
