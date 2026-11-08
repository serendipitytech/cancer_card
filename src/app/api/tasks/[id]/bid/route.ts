import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, bids, crewMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { placeBidSchema, uuidParamSchema } from "@/lib/validators";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { closeAuctionWithBid, getLowestBid } from "@/lib/auction-close";

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
      // Auction has expired - auto-close it by awarding to the lowest bidder.
      const lowestBid = getLowestBid(taskId);
      closeAuctionWithBid(task, lowestBid, {
        actorId: lowestBid?.userId ?? session.user.id,
        actorName: "System",
      });

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

      return { bid, totalBids };
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

    // Bid-threshold auto-close routes through the same shared helper as the
    // expiry and manual closes, so there is exactly one auto-close code path.
    const autoClose = settings?.autoCloseAfterBids;
    if (autoClose && bidResult.totalBids >= autoClose) {
      closeAuctionWithBid(task, getLowestBid(taskId), {
        actorId: session.user.id,
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
