import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, bids, crewMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { placeBidSchema } from "@/lib/validators";
import { logActivity } from "@/lib/points";

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

    const auctionSettings = task.auctionSettings as { minBid?: number } | null;
    if (auctionSettings?.minBid && parsed.data.bidAmount < auctionSettings.minBid) {
      return NextResponse.json(
        { error: `Minimum bid is ${auctionSettings.minBid} pts` },
        { status: 400 }
      );
    }

    const bid = db
      .insert(bids)
      .values({
        taskId,
        userId: session.user.id,
        bidAmount: parsed.data.bidAmount,
        comment: parsed.data.comment || null,
      })
      .returning()
      .get();

    logActivity(task.crewId, "bid_placed", session.user.id, {
      taskId: task.id,
      taskTitle: task.title,
      bidAmount: parsed.data.bidAmount,
      comment: parsed.data.comment,
    });

    const totalBids = db
      .select({ id: bids.id })
      .from(bids)
      .where(eq(bids.taskId, taskId))
      .all().length;

    const autoClose = (task.auctionSettings as { autoCloseAfterBids?: number | null } | null)?.autoCloseAfterBids;
    if (autoClose && totalBids >= autoClose) {
      const winningBid = db
        .select()
        .from(bids)
        .where(eq(bids.taskId, taskId))
        .orderBy(bids.bidAmount)
        .limit(1)
        .get();

      if (winningBid) {
        db.update(tasks)
          .set({
            status: "claimed",
            claimedBy: winningBid.userId,
            finalPointCost: winningBid.bidAmount,
          })
          .where(eq(tasks.id, taskId))
          .run();

        logActivity(task.crewId, "auction_won", winningBid.userId, {
          taskId: task.id,
          taskTitle: task.title,
          winningBid: winningBid.bidAmount,
        });
      }
    }

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error("Place bid error:", error);
    return NextResponse.json(
      { error: "Failed to place bid" },
      { status: 500 }
    );
  }
}
