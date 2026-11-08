import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, bids, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { uuidParamSchema } from "@/lib/validators";
import { closeAuctionWithBid, getLowestBid } from "@/lib/auction-close";

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

    if (!membership || (membership.role !== "card_holder" && membership.role !== "admin")) {
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
      winningBid = getLowestBid(taskId);
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

    // Award + close through the shared auto-close helper (same path as the
    // expiry and bid-threshold closes). The status guard inside the helper
    // makes a manual close safe even if an expiry close already fired.
    const result = closeAuctionWithBid(task, winningBid, {
      actorId: session.user.id,
      actorName: session.user.name || "Card Holder",
      logData: { closedBy: session.user.id, closedManually: true },
    });

    if (!result.closed) {
      return NextResponse.json(
        { error: "This auction is no longer active" },
        { status: 409 }
      );
    }

    const updatedTask = db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .get();

    return NextResponse.json({
      success: true,
      task: updatedTask,
      winningBid,
    });
  } catch (error) {
    console.error("Close auction error:", error);
    return NextResponse.json(
      { error: "Failed to close auction" },
      { status: 500 }
    );
  }
}
