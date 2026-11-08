import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, bids, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { uuidParamSchema } from "@/lib/validators";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
import { canManageCrew } from "@/lib/roles";
import { recordAuctionWin, awardEligibleBadges } from "@/lib/member-stats";
import { emitBadgeNotifications } from "@/lib/badges";

const closeAuctionSchema = z.object({
  action: z.enum(["auto", "select"]),
  bidId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const parsedId = uuidParamSchema.safeParse(taskId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.requestMode !== "auction") {
      return NextResponse.json(
        { error: "This task is not an auction" },
        { status: 400 }
      );
    }

    if (task.status !== "pending") {
      return NextResponse.json(
        { error: "This auction is no longer active" },
        { status: 409 }
      );
    }

    // Check if user is Card Holder or Admin
    const membership = db
      .select()
      .from(crewMembers)
      .where(
        and(
          eq(crewMembers.crewId, task.crewId),
          eq(crewMembers.userId, session.user.id)
        )
      )
      .get();

    if (!membership || !canManageCrew(membership.role)) {
      return NextResponse.json(
        { error: "Only Card Holder or Admin can close auctions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = closeAuctionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let winningBid;

    if (parsed.data.action === "auto") {
      // Award to lowest bidder
      winningBid = db
        .select()
        .from(bids)
        .where(eq(bids.taskId, taskId))
        .orderBy(bids.bidAmount)
        .limit(1)
        .get();
    } else if (parsed.data.action === "select") {
      // Award to specific bid
      if (!parsed.data.bidId) {
        return NextResponse.json(
          { error: "bidId is required for select action" },
          { status: 400 }
        );
      }

      winningBid = db
        .select()
        .from(bids)
        .where(
          and(eq(bids.taskId, taskId), eq(bids.id, parsed.data.bidId))
        )
        .get();

      if (!winningBid) {
        return NextResponse.json(
          { error: "Bid not found" },
          { status: 404 }
        );
      }
    }

    if (!winningBid) {
      return NextResponse.json(
        { error: "No bids available to award" },
        { status: 400 }
      );
    }

    const winner = winningBid;

    // Award the auction, record the win stat, and evaluate badges in one
    // transaction. The guarded update (status still 'pending') means a second
    // racing close cannot double-award. If it returns no row, someone already
    // closed it.
    const outcome = db.transaction((tx) => {
      const updatedTask = tx
        .update(tasks)
        .set({
          status: "claimed",
          claimedBy: winner.userId,
          finalPointCost: winner.bidAmount,
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
        .returning()
        .get();

      if (!updatedTask) {
        return { closed: false as const };
      }

      recordAuctionWin(tx, task.crewId, winner.userId);
      const awardedBadges = awardEligibleBadges(tx, task.crewId, winner.userId);

      return { closed: true as const, updatedTask, awardedBadges };
    });

    if (!outcome.closed) {
      return NextResponse.json(
        { error: "This auction is no longer active" },
        { status: 409 }
      );
    }

    // Log activity
    logActivity(task.crewId, "auction_won", winner.userId, {
      taskId: task.id,
      taskTitle: task.title,
      winningBid: winner.bidAmount,
      closedBy: session.user.id,
      closedManually: true,
    });

    // Notify winner
    notifyOnEvent(task.crewId, "auction_won", winner.userId, {
      taskId: task.id,
      taskTitle: task.title,
      winningBid: winner.bidAmount,
      winnerId: winner.userId,
      actorName: session.user.name || "Card Holder",
    });

    emitBadgeNotifications(
      task.crewId,
      winner.userId,
      outcome.awardedBadges,
      session.user.name || "Card Holder"
    );

    return NextResponse.json({
      success: true,
      task: outcome.updatedTask,
      winningBid: winner,
    });
  } catch (error) {
    console.error("Close auction error:", error);
    return NextResponse.json(
      { error: "Failed to close auction" },
      { status: 500 }
    );
  }
}
