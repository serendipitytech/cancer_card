import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/points";
import { notifyOnEvent } from "@/lib/notification-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { uuidParamSchema } from "@/lib/validators";
import { z } from "zod";

const assignSchema = z.object({
  userId: z.string().uuid(),
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

    const { allowed } = checkRateLimit("tasks:assign", session.user.id, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id: taskId } = await params;
    const parsedId = uuidParamSchema.safeParse(taskId);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const { userId: assigneeId } = parsed.data;

    const result = db.transaction((tx) => {
      const task = tx.select().from(tasks).where(eq(tasks.id, taskId)).get();

      if (!task) {
        return { error: "Task not found", status: 404 } as const;
      }

      if (task.status !== "pending") {
        return { error: "Only pending tasks can be assigned", status: 409 } as const;
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
        return { error: "Only the Card Holder can assign tasks", status: 403 } as const;
      }

      const assigneeMembership = tx
        .select({ role: crewMembers.role })
        .from(crewMembers)
        .where(
          and(
            eq(crewMembers.crewId, task.crewId),
            eq(crewMembers.userId, assigneeId)
          )
        )
        .get();

      if (!assigneeMembership) {
        return { error: "That person is not in this crew", status: 400 } as const;
      }

      const updated = tx
        .update(tasks)
        .set({
          assignedTo: assigneeId,
          requestMode: "direct",
        })
        .where(eq(tasks.id, taskId))
        .returning()
        .get();

      return { data: updated, crewId: task.crewId, taskTitle: task.title };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    logActivity(result.crewId, "task_assigned", userId, {
      taskId,
      taskTitle: result.taskTitle,
      assignedTo: assigneeId,
    });

    notifyOnEvent(result.crewId, "task_assigned", userId, {
      taskId,
      taskTitle: result.taskTitle,
      actorName: session.user.name || "Someone",
      assignedTo: assigneeId,
    });

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Assign task error:", error);
    return NextResponse.json(
      { error: "Failed to assign task" },
      { status: 500 }
    );
  }
}
