import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, bids, crewMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { placeBidSchema, uuidParamSchema } from "@/lib/validators";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
import { checkRateLimit } from "@/lib/rate-limit";

type AuctionSettings = {
  endsAt?: string;
  minBid?: number;
  autoCloseAfterBids?: number | null;
} | null;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = checkRateLimit("bids", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 60,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many bids placed. Please try again later." },
        { status: 429 }
      );
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

    const settings = task.auctionSettings as AuctionSettings;
    if (settings?.endsAt && new Date(settings.endsAt) < new Date()) {
      return NextResponse.json(
        { error: "This auction has ended" },
        { status: 409 }
      );
    }

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

    if (!membership || membership.role === "card_holder") {
      return NextResponse.json(
        { error: "Card Holders can't bid on their own tasks" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = placeBidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const lowestBid = db
      .select({ bidAmount: bids.bidAmount })
      .from(bids)
      .where(eq(bids.taskId, taskId))
      .orderBy(bids.bidAmount)
      .limit(1)
      .get();

    const currentLowest = lowestBid?.bidAmount ?? task.pointCost;

    if (parsed.data.bidAmount >= currentLowest) {
      return NextResponse.json(
        { error: `Bid must be lower than ${currentLowest} pts` },
        { status: 400 }
      );
    }

    if (settings?.minBid && parsed.data.bidAmount < settings.minBid) {
      return NextResponse.json(
        { error: `Minimum bid is ${settings.minBid} pts` },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    const bidResult = db.transaction((tx) => {
      const bid = tx
        .insert(bids)
        .values({
          taskId,
          userId,
          bidAmount: parsed.data.bidAmount,
          comment: parsed.data.comment || null,
        })
        .returning()
        .get();

      const { count: totalBids } = tx
        .select({ count: sql<number>`count(*)` })
        .from(bids)
        .where(eq(bids.taskId, taskId))
        .get()!;

      const autoClose = settings?.autoCloseAfterBids;
      let auctionClosed = false;
      let winnerUserId: string | null = null;
      let winnerBidAmount: number | null = null;

      if (autoClose && totalBids >= autoClose) {
        const winningBid = tx
          .select()
          .from(bids)
          .where(eq(bids.taskId, taskId))
          .orderBy(bids.bidAmount)
          .limit(1)
          .get();

        if (winningBid) {
          const updated = tx
            .update(tasks)
            .set({
              status: "claimed",
              claimedBy: winningBid.userId,
              finalPointCost: winningBid.bidAmount,
            })
            .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
            .returning()
            .get();

          if (updated) {
            auctionClosed = true;
            winnerUserId = winningBid.userId;
            winnerBidAmount = winningBid.bidAmount;
          }
        }
      }

      return { bid, auctionClosed, winnerUserId, winnerBidAmount };
    });

    logActivity(task.crewId, "bid_placed", session.user.id, {
      taskId: task.id,
      taskTitle: task.title,
      bidAmount: parsed.data.bidAmount,
      comment: parsed.data.comment,
    });

    notifyOnEvent(task.crewId, "bid_placed", session.user.id, {
      taskId: task.id,
      taskTitle: task.title,
      bidAmount: parsed.data.bidAmount,
      actorName: session.user.name || "Someone",
    });

    if (bidResult.auctionClosed && bidResult.winnerUserId) {
      logActivity(task.crewId, "auction_won", bidResult.winnerUserId, {
        taskId: task.id,
        taskTitle: task.title,
        winningBid: bidResult.winnerBidAmount,
      });

      notifyOnEvent(task.crewId, "auction_won", bidResult.winnerUserId, {
        taskId: task.id,
        taskTitle: task.title,
        winningBid: bidResult.winnerBidAmount,
        winnerId: bidResult.winnerUserId,
        actorName: session.user.name || "Someone",
      });
    }

    return NextResponse.json(bidResult.bid, { status: 201 });
  } catch (error) {
    console.error("Place bid error:", error);
    return NextResponse.json(
      { error: "Failed to place bid" },
      { status: 500 }
    );
  }
}
