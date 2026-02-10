import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Crews ───────────────────────────────────────────────────────────────────

export const crews = sqliteTable("crews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  cardHolderId: text("card_holder_id")
    .notNull()
    .references(() => users.id),
  pointBalance: integer("point_balance").notNull().default(500),
  inviteCode: text("invite_code").notNull().unique(),
  settings: text("settings", { mode: "json" }).$type<CrewSettings>().default({
    defaultPoints: 500,
    allowNegativeBalance: true,
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type CrewSettings = {
  defaultPoints: number;
  allowNegativeBalance: boolean;
};

// ─── Crew Members ────────────────────────────────────────────────────────────

export const crewMembers = sqliteTable(
  "crew_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    crewId: text("crew_id")
      .notNull()
      .references(() => crews.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["card_holder", "admin", "crew_member"],
    }).notNull(),
    stats: text("stats", { mode: "json" }).$type<MemberStats>().default({
      tasksCompleted: 0,
      pointsSpent: 0,
      auctionWins: 0,
      totalResponseTimeMs: 0,
      responseCount: 0,
      currentStreak: 0,
      longestStreak: 0,
    }),
    badges: text("badges", { mode: "json" }).$type<string[]>().default([]),
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("crew_member_unique").on(table.crewId, table.userId),
  ]
);

export type MemberStats = {
  tasksCompleted: number;
  pointsSpent: number;
  auctionWins: number;
  totalResponseTimeMs: number;
  responseCount: number;
  currentStreak: number;
  longestStreak: number;
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = sqliteTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  pointCost: integer("point_cost").notNull(),
  requestMode: text("request_mode", {
    enum: ["direct", "open", "auction"],
  }).notNull(),
  assignedTo: text("assigned_to").references(() => users.id),
  claimedBy: text("claimed_by").references(() => users.id),
  status: text("status", {
    enum: ["pending", "claimed", "in_progress", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  urgency: text("urgency", {
    enum: ["whenever", "today", "asap"],
  })
    .notNull()
    .default("whenever"),
  dueBy: integer("due_by", { mode: "timestamp" }),
  auctionSettings: text("auction_settings", { mode: "json" }).$type<AuctionSettings>(),
  finalPointCost: integer("final_point_cost"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export type AuctionSettings = {
  minBid: number;
  durationMinutes: number;
  autoCloseAfterBids: number | null;
  endsAt: string | null;
};

// ─── Bids (Reverse Auctions) ────────────────────────────────────────────────

export const bids = sqliteTable("bids", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  bidAmount: integer("bid_amount").notNull(),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Milestones (Self-Care Log) ──────────────────────────────────────────────

export const milestones = sqliteTable("milestones", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  milestoneType: text("milestone_type").notNull(),
  pointsEarned: integer("points_earned").notNull(),
  note: text("note"),
  isStreakBonus: integer("is_streak_bonus", { mode: "boolean" })
    .notNull()
    .default(false),
  loggedAt: integer("logged_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Activity Feed ───────────────────────────────────────────────────────────

export const activityFeed = sqliteTable("activity_feed", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  eventType: text("event_type", {
    enum: [
      "task_created",
      "task_claimed",
      "task_completed",
      "bid_placed",
      "auction_won",
      "milestone_logged",
      "badge_earned",
      "member_joined",
    ],
  }).notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Task Menu Templates ─────────────────────────────────────────────────────

export const taskMenuTemplates = sqliteTable("task_menu_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  defaultPoints: integer("default_points").notNull(),
  emoji: text("emoji").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

// ─── Self-Care Routine Definitions ───────────────────────────────────────────

export const selfCareRoutines = sqliteTable("self_care_routines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  crewId: text("crew_id")
    .notNull()
    .references(() => crews.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  milestoneType: text("milestone_type").notNull(),
  pointValue: integer("point_value").notNull(),
  emoji: text("emoji").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
