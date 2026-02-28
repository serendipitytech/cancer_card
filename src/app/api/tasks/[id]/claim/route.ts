import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { uuidParamSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = checkRateLimit("tasks:claim", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many claims. Please try again later." },
        { status: 429 }
      );
    }

    const { id: taskId } = await params;
    const parsedId = uuidParamSchema.safeParse(taskId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const userId = session.user.id;

    const result = db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();

      if (!task) {
        return { error: "Task not found", status: 404 } as const;
      }

      if (task.status !== "pending") {
        return { error: "This task has already been claimed", status: 409 } as const;
      }

      if (task.requestMode === "auction") {
        return { error: "Auction tasks must be won through bidding", status: 400 } as const;
      }

      if (task.requestMode === "direct" && task.assignedTo && task.assignedTo !== userId) {
        return { error: "This task is assigned to someone else", status: 403 } as const;
      }

      const membership = tx
        .select()
        .from(crewMembers)
        .where(
          and(
            eq(crewMembers.crewId, task.crewId),
            eq(crewMembers.userId, userId)
          )
        )
        .get();

      if (!membership) {
        return { error: "You're not a member of this crew", status: 403 } as const;
      }

      if (membership.role === "card_holder") {
        return { error: "Card Holders cannot claim their own tasks", status: 403 } as const;
      }

      const updated = tx
        .update(tasks)
        .set({
          claimedBy: userId,
          status: "claimed",
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
        .returning()
        .get();

      if (!updated) {
        return { error: "This task has already been claimed", status: 409 } as const;
      }

      return { data: updated, crewId: task.crewId, taskTitle: task.title } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    logActivity(result.crewId, "task_claimed", userId, {
      taskId,
      taskTitle: result.taskTitle,
    });

    notifyOnEvent(result.crewId, "task_claimed", userId, {
      taskId,
      taskTitle: result.taskTitle,
      actorName: session.user.name || "Someone",
    });

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Claim task error:", error);
    return NextResponse.json(
      { error: "Failed to claim task" },
      { status: 500 }
    );
  }
}
