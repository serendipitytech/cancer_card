import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers, crews, activityFeed } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyOnEvent } from "@/lib/notification-service";
import { uuidParamSchema } from "@/lib/validators";
import { z } from "zod";

const closeTaskSchema = z.object({
  action: z.enum(["complete", "cancel"]),
  creditUserId: z.string().uuid().optional(),
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

    const { allowed } = checkRateLimit("tasks:close", session.user.id, {
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

    const body = await request.json();
    const parsed = closeTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { action, creditUserId } = parsed.data;

    const result = db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();

      if (!task) {
        return { error: "Task not found", status: 404 } as const;
      }

      if (task.status === "completed" || task.status === "cancelled") {
        return { error: "This task is already closed", status: 409 } as const;
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
        return { error: "Only the Card Holder can close tasks", status: 403 } as const;
      }

      if (action === "complete") {
        const finalCost = task.finalPointCost || task.pointCost;

        tx.update(crews)
          .set({ pointBalance: sql`${crews.pointBalance} - ${finalCost}` })
          .where(eq(crews.id, task.crewId))
          .run();

        const updated = tx
          .update(tasks)
          .set({
            status: "completed",
            finalPointCost: finalCost,
            completedAt: new Date(),
            claimedBy: creditUserId || task.claimedBy,
          })
          .where(eq(tasks.id, taskId))
          .returning()
          .get();

        if (creditUserId) {
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
                eq(crewMembers.userId, creditUserId)
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
              completedBy: creditUserId || task.claimedBy,
            },
          })
          .run();

        return { data: updated, crewId: task.crewId, eventType: "task_completed" as const };
      }

      // Cancel — no points deducted
      const updated = tx
        .update(tasks)
        .set({ status: "cancelled" })
        .where(eq(tasks.id, taskId))
        .returning()
        .get();

      tx.insert(activityFeed)
        .values({
          crewId: task.crewId,
          eventType: "task_cancelled",
          actorId: userId,
          data: { taskId: task.id, taskTitle: task.title },
        })
        .run();

      return { data: updated, crewId: task.crewId, eventType: "task_cancelled" as const };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    notifyOnEvent(result.crewId, result.eventType, session.user.id, {
      taskId,
      taskTitle: result.data?.title || "a task",
      actorName: session.user.name || "Someone",
    });

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Close task error:", error);
    return NextResponse.json(
      { error: "Failed to close task" },
      { status: 500 }
    );
  }
}
