import "server-only";

import { db } from "@/db";
import { users, crews, tasks, milestones, activityFeed } from "@/db/schema";
import { sql, desc, and, type SQL } from "drizzle-orm";

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeParseJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Overview Stats ─────────────────────────────────────────────────────────

type OverviewStats = {
  totalUsers: number;
  totalCrews: number;
  activeTasks: number;
  completedTasks: number;
  totalMilestones: number;
  totalActivity: number;
  recentSignups: number;
  recentTasks: number;
};

export function getOverviewStats(): OverviewStats {
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  const rows = db.all<{
    totalUsers: number;
    totalCrews: number;
    activeTasks: number;
    completedTasks: number;
    totalMilestones: number;
    totalActivity: number;
    recentSignups: number;
    recentTasks: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM crews) AS totalCrews,
      (SELECT COUNT(*) FROM tasks WHERE status IN ('pending', 'claimed', 'in_progress')) AS activeTasks,
      (SELECT COUNT(*) FROM tasks WHERE status = 'completed') AS completedTasks,
      (SELECT COUNT(*) FROM milestones) AS totalMilestones,
      (SELECT COUNT(*) FROM activity_feed) AS totalActivity,
      (SELECT COUNT(*) FROM users WHERE created_at >= ${sevenDaysAgo}) AS recentSignups,
      (SELECT COUNT(*) FROM tasks WHERE created_at >= ${sevenDaysAgo}) AS recentTasks
  `);

  return rows[0] ?? {
    totalUsers: 0,
    totalCrews: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalMilestones: 0,
    totalActivity: 0,
    recentSignups: 0,
    recentTasks: 0,
  };
}

// ─── Users ──────────────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  crewCount: number;
  createdAt: Date;
};

export function getAllUsers(): AdminUser[] {
  const rows = db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      crewCount: sql<number>`(
        SELECT COUNT(*) FROM crew_members WHERE crew_members.user_id = ${users.id}
      )`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .all();

  return rows.map((row) => ({
    ...row,
    crewCount: Number(row.crewCount),
  }));
}

// ─── Crews ──────────────────────────────────────────────────────────────────

export type AdminCrew = {
  id: string;
  name: string;
  cardHolderName: string;
  memberCount: number;
  taskCount: number;
  pointBalance: number;
  inviteCode: string;
  createdAt: Date;
};

export function getAllCrews(): AdminCrew[] {
  const rows = db
    .select({
      id: crews.id,
      name: crews.name,
      pointBalance: crews.pointBalance,
      inviteCode: crews.inviteCode,
      createdAt: crews.createdAt,
      cardHolderName: sql<string>`(
        SELECT display_name FROM users WHERE users.id = ${crews.cardHolderId}
      )`,
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM crew_members WHERE crew_members.crew_id = ${crews.id}
      )`,
      taskCount: sql<number>`(
        SELECT COUNT(*) FROM tasks WHERE tasks.crew_id = ${crews.id}
      )`,
    })
    .from(crews)
    .orderBy(desc(crews.createdAt))
    .all();

  return rows.map((row) => ({
    ...row,
    memberCount: Number(row.memberCount),
    taskCount: Number(row.taskCount),
  }));
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export type AdminTask = {
  id: string;
  title: string;
  crewId: string;
  crewName: string;
  status: string;
  requestMode: string;
  pointCost: number;
  urgency: string;
  createdByName: string;
  claimedByName: string | null;
  createdAt: Date;
};

type TaskFilters = {
  status?: string;
  crewId?: string;
};

export function getAllTasks(filters?: TaskFilters): AdminTask[] {
  const conditions: SQL[] = [];

  if (filters?.status) {
    conditions.push(sql`tasks.status = ${filters.status}`);
  }
  if (filters?.crewId) {
    conditions.push(sql`tasks.crew_id = ${filters.crewId}`);
  }

  const whereClause =
    conditions.length > 0 ? sql`WHERE ${and(...conditions)}` : sql``;

  const rows = db.all<{
    id: string;
    title: string;
    crew_id: string;
    crew_name: string;
    status: string;
    request_mode: string;
    point_cost: number;
    urgency: string;
    created_by_name: string;
    claimed_by_name: string | null;
    created_at: number;
  }>(sql`
    SELECT
      tasks.id,
      tasks.title,
      tasks.crew_id,
      c.name AS crew_name,
      tasks.status,
      tasks.request_mode,
      tasks.point_cost,
      tasks.urgency,
      creator.display_name AS created_by_name,
      claimer.display_name AS claimed_by_name,
      tasks.created_at
    FROM tasks
    LEFT JOIN crews c ON c.id = tasks.crew_id
    LEFT JOIN users creator ON creator.id = tasks.created_by
    LEFT JOIN users claimer ON claimer.id = tasks.claimed_by
    ${whereClause}
    ORDER BY tasks.created_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    crewId: row.crew_id,
    crewName: row.crew_name,
    status: row.status,
    requestMode: row.request_mode,
    pointCost: row.point_cost,
    urgency: row.urgency,
    createdByName: row.created_by_name,
    claimedByName: row.claimed_by_name,
    createdAt: new Date(row.created_at * 1000),
  }));
}

// ─── Activity Feed ──────────────────────────────────────────────────────────

export type AdminActivity = {
  id: string;
  eventType: string;
  actorName: string;
  crewName: string;
  data: Record<string, unknown> | null;
  createdAt: Date;
};

export function getGlobalActivity(limit: number): AdminActivity[] {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500);

  const rows = db.all<{
    id: string;
    event_type: string;
    actor_name: string;
    crew_name: string;
    data: string | null;
    created_at: number;
  }>(sql`
    SELECT
      activity_feed.id,
      activity_feed.event_type,
      u.display_name AS actor_name,
      c.name AS crew_name,
      activity_feed.data,
      activity_feed.created_at
    FROM activity_feed
    LEFT JOIN users u ON u.id = activity_feed.actor_id
    LEFT JOIN crews c ON c.id = activity_feed.crew_id
    ORDER BY activity_feed.created_at DESC
    LIMIT ${safeLimit}
  `);

  return rows.map((row) => ({
    id: row.id,
    eventType: row.event_type,
    actorName: row.actor_name,
    crewName: row.crew_name,
    data: row.data ? safeParseJson(row.data) : null,
    createdAt: new Date(row.created_at * 1000),
  }));
}

// ─── Filter Helpers ─────────────────────────────────────────────────────────

export type CrewOption = {
  id: string;
  name: string;
};

export function getCrewsForFilter(): CrewOption[] {
  return db
    .select({ id: crews.id, name: crews.name })
    .from(crews)
    .orderBy(crews.name)
    .all();
}
