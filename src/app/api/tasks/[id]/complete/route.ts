import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers, crews } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { deductPoints, logActivity } from "@/lib/points";

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

    if (task.status === "completed") {
      return NextResponse.json(
        { error: "This task is already completed" },
        { status: 409 }
      );
    }

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

    if (membership.role !== "card_holder" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only the Card Holder can mark tasks as completed" },
        { status: 403 }
      );
    }

    const finalCost = task.finalPointCost || task.pointCost;
    const newBalance = deductPoints(task.crewId, finalCost);

    const updated = db
      .update(tasks)
      .set({
        status: "completed",
        finalPointCost: finalCost,
        completedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning()
      .get();

    if (task.claimedBy) {
      db.update(crewMembers)
        .set({
          stats: sql`json_set(
            COALESCE(${crewMembers.stats}, '{}'),
            '$.tasksCompleted', COALESCE(json_extract(${crewMembers.stats}, '$.tasksCompleted'), 0) + 1,
            '$.pointsSpent', COALESCE(json_extract(${crewMembers.stats}, '$.pointsSpent'), 0) + ${finalCost}
          )`,
        })
        .where(
          and(
            eq(crewMembers.crewId, task.crewId),
            eq(crewMembers.userId, task.claimedBy)
          )
        )
        .run();
    }

    logActivity(task.crewId, "task_completed", session.user.id, {
      taskId: task.id,
      taskTitle: task.title,
      pointCost: finalCost,
      completedBy: task.claimedBy,
    });

    return NextResponse.json({
      ...updated,
      newBalance,
    });
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}
