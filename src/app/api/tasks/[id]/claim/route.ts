import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

    if (task.status !== "pending") {
      return NextResponse.json(
        { error: "This task has already been claimed" },
        { status: 409 }
      );
    }

    if (task.requestMode === "auction") {
      return NextResponse.json(
        { error: "Auction tasks must be won through bidding" },
        { status: 400 }
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

    if (!membership) {
      return NextResponse.json(
        { error: "You're not a member of this crew" },
        { status: 403 }
      );
    }

    const updated = db
      .update(tasks)
      .set({
        claimedBy: session.user.id,
        status: "claimed",
      })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    logActivity(task.crewId, "task_claimed", session.user.id, {
      taskId: task.id,
      taskTitle: task.title,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Claim task error:", error);
    return NextResponse.json(
      { error: "Failed to claim task" },
      { status: 500 }
    );
  }
}
