import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers, crews, activityFeed } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyOnEvent } from "@/lib/notification-service";
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

    const { allowed } = checkRateLimit("tasks:complete", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const userId = session.user.id;
    const { id: taskId } = await params;
    const parsedId = uuidParamSchema.safeParse(taskId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const result = db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();

      if (!task) {
        return { error: "Task not found", status: 404 } as const;
      }

      if (task.status === "completed") {
        return { error: "This task is already completed", status: 409 } as const;
      }

      const membership = tx
        .select({ role: crewMembers.role })
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

      if (membership.role !== "card_holder" && membership.role !== "admin") {
        return { error: "Only the Card Holder can mark tasks as completed", status: 403 } as const;
      }

      const finalCost = task.finalPointCost || task.pointCost;

      const updatedCrew = tx
        .update(crews)
        .set({
          pointBalance: sql`${crews.pointBalance} - ${finalCost}`,
        })
        .where(eq(crews.id, task.crewId))
        .returning({ pointBalance: crews.pointBalance })
        .get();

      const updated = tx
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
        tx.update(crewMembers)
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

      tx.insert(activityFeed)
        .values({
          crewId: task.crewId,
          eventType: "task_completed",
          actorId: userId,
          data: {
            taskId: task.id,
            taskTitle: task.title,
            pointCost: finalCost,
            completedBy: task.claimedBy,
          },
        })
        .run();

      return { data: { updated, newBalance: updatedCrew.pointBalance }, crewId: task.crewId } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    notifyOnEvent(result.crewId, "task_completed", session.user.id, {
      taskId: taskId,
      taskTitle: result.data.updated?.title || "a task",
      pointCost: result.data.updated?.finalPointCost,
      actorName: session.user.name || "Someone",
    });

    return NextResponse.json({
      ...result.data.updated,
      newBalance: result.data.newBalance,
    });
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}
