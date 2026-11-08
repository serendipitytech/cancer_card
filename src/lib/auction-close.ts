import { db } from "@/db";
import { tasks, bids } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";

// ─── Shared auction auto-close ───────────────────────────────────────────────
// Single source of truth for awarding an auction to a winning bid. Previously
// this logic was copy-pasted across the bid route (expiry + bid-threshold),
// the close-auction route, and the dead check-auction route. Keeping it here
// guarantees every path updates the task, logs the activity, and fires the
// auction_won notification identically.

export type AuctionTaskRef = {
  id: string;
  crewId: string;
  title: string;
};

export type WinningBid = {
  userId: string;
  bidAmount: number;
};

export type AuctionCloseResult =
  | { closed: true; winnerId: string; winningBid: number }
  | { closed: false; reason: "no_bids" | "already_closed" };

type CloseOptions = {
  // Who the notification is attributed to. For system/expiry closes this is the
  // winner's id (preserving prior behavior); for manual closes it is the actor.
  actorId: string;
  actorName: string;
  // Extra, call-site-specific metadata merged into the activity log entry.
  logData?: Record<string, unknown>;
};

// Lowest bid wins an auction. Returned shape is deliberately minimal so callers
// outside and inside a transaction can both use it.
export function getLowestBid(
  taskId: string
): { id: string; userId: string; bidAmount: number } | undefined {
  return db
    .select({
      id: bids.id,
      userId: bids.userId,
      bidAmount: bids.bidAmount,
    })
    .from(bids)
    .where(eq(bids.taskId, taskId))
    .orderBy(bids.bidAmount)
    .limit(1)
    .get();
}

// Awards the auction to `winningBid` and closes the task. The status guard
// (`status = pending`) makes this idempotent and race-safe: only the first
// caller to flip a pending auction logs/notifies, so concurrent close attempts
// cannot double-award or double-notify.
export function closeAuctionWithBid(
  task: AuctionTaskRef,
  winningBid: WinningBid | undefined,
  options: CloseOptions
): AuctionCloseResult {
  if (!winningBid) {
    return { closed: false, reason: "no_bids" };
  }

  const updated = db
    .update(tasks)
    .set({
      status: "claimed",
      claimedBy: winningBid.userId,
      finalPointCost: winningBid.bidAmount,
    })
    .where(and(eq(tasks.id, task.id), eq(tasks.status, "pending")))
    .returning()
    .get();

  if (!updated) {
    return { closed: false, reason: "already_closed" };
  }

  logActivity(task.crewId, "auction_won", winningBid.userId, {
    taskId: task.id,
    taskTitle: task.title,
    winningBid: winningBid.bidAmount,
    ...options.logData,
  });

  notifyOnEvent(task.crewId, "auction_won", options.actorId, {
    taskId: task.id,
    taskTitle: task.title,
    winningBid: winningBid.bidAmount,
    winnerId: winningBid.userId,
    actorName: options.actorName,
  });

  return {
    closed: true,
    winnerId: winningBid.userId,
    winningBid: winningBid.bidAmount,
  };
}
