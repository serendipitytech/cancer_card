import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uuidParamSchema } from "@/lib/validators";
import { closeAuctionWithBid, getLowestBid } from "@/lib/auction-close";

type AuctionSettings = {
  endsAt?: string;
  minBid?: number;
  autoCloseAfterBids?: number | null;
} | null;

export async function GET(
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

    const settings = task.auctionSettings as AuctionSettings;
    const now = new Date();
    const endsAt = settings?.endsAt ? new Date(settings.endsAt) : null;
    const isExpired = endsAt && endsAt < now;

    // If expired and still pending, auto-close it through the shared helper.
    if (isExpired && task.status === "pending") {
      const lowestBid = getLowestBid(taskId);
      const result = closeAuctionWithBid(task, lowestBid, {
        actorId: lowestBid?.userId ?? session.user.id,
        actorName: "System",
        logData: { autoClosedOnExpiry: true },
      });

      if (result.closed) {
        return NextResponse.json({
          status: "closed",
          expired: true,
          endsAt: endsAt?.toISOString(),
          winner: {
            userId: result.winnerId,
            bidAmount: result.winningBid,
          },
        });
      }
    }

    return NextResponse.json({
      status: task.status === "pending" ? (isExpired ? "expired" : "active") : task.status,
      expired: isExpired || false,
      endsAt: endsAt?.toISOString() || null,
      timeRemaining: endsAt && !isExpired ? Math.max(0, endsAt.getTime() - now.getTime()) : 0,
    });
  } catch (error) {
    console.error("Check auction error:", error);
    return NextResponse.json(
      { error: "Failed to check auction status" },
      { status: 500 }
    );
  }
}
