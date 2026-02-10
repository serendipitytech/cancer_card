import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be 50 characters or less"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or less"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

// ─── Crew ────────────────────────────────────────────────────────────────────

export const createCrewSchema = z.object({
  name: z
    .string()
    .min(2, "Crew name must be at least 2 characters")
    .max(50, "Crew name must be 50 characters or less"),
  initialPoints: z.number().int().min(100).max(10000).default(500),
});

export const joinCrewSchema = z.object({
  inviteCode: z
    .string()
    .length(8, "Invite code must be 8 characters"),
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1, "Category is required"),
  pointCost: z.number().int().min(1, "Points must be at least 1"),
  requestMode: z.enum(["direct", "open", "auction"]),
  assignedTo: z.string().uuid().optional(),
  urgency: z.enum(["whenever", "today", "asap"]).default("whenever"),
  dueBy: z.string().datetime().optional(),
  auctionSettings: z
    .object({
      minBid: z.number().int().min(1).default(5),
      durationMinutes: z.number().int().min(5).max(1440).default(60),
      autoCloseAfterBids: z.number().int().min(1).nullable().default(null),
    })
    .optional(),
});

export const placeBidSchema = z.object({
  bidAmount: z.number().int().min(1, "Bid must be at least 1 point"),
  comment: z.string().max(200).optional(),
});

// ─── Milestones ──────────────────────────────────────────────────────────────

export const logMilestoneSchema = z.object({
  milestoneType: z.string().min(1, "Milestone type is required"),
  note: z.string().max(200).optional(),
});

// ─── Task Menu Templates ─────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  defaultPoints: z.number().int().min(1).max(1000),
  emoji: z.string().min(1).max(4),
});

// ─── Self-Care Routines ──────────────────────────────────────────────────────

export const createRoutineSchema = z.object({
  name: z.string().min(1).max(100),
  milestoneType: z.string().min(1).max(50),
  pointValue: z.number().int().min(1).max(500),
  emoji: z.string().min(1).max(4),
});
