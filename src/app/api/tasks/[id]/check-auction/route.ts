import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { uuidParamSchema } from "@/lib/validators";

type AuctionSettings = {
  endsAt?: string;
  minBid?: number;
  autoCloseAfterBids?: number | null;
} | null;

// Read-only: reports auction status without mutating state. Closing an auction
// (awarding a winner, deducting points) must go through the write endpoints.
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

    // Membership check: only crew members may inspect a crew's auction.
    const membership = db
      .select({ role: crewMembers.role })
      .from(crewMembers)
      .where(
        and(
          eq(crewMembers.crewId, task.crewId),
          eq(crewMembers.userId, session.user.id)
        )
      )
      .get();

    if (!membership) {
      return NextResponse.json(
        { error: "You're not a member of this crew" },
        { status: 403 }
      );
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
    const isExpired = endsAt ? endsAt < now : false;

    return NextResponse.json({
      status: task.status === "pending" ? (isExpired ? "expired" : "active") : task.status,
      expired: isExpired,
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
