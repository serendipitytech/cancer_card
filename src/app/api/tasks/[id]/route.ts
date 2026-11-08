import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, bids, crewMembers, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { uuidParamSchema } from "@/lib/validators";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed, resetAt } = checkRateLimit("tasks:read", session.user.id, {
      windowMs: 60 * 1000,
      maxRequests: 120,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
      );
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

    // Membership check: a caller may only see a task in a crew they belong to.
    // Never trust a client-supplied crew id — derive it from the task row.
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

    const taskBids =
      task.requestMode === "auction"
        ? db
            .select({
              id: bids.id,
              taskId: bids.taskId,
              bidAmount: bids.bidAmount,
              comment: bids.comment,
              createdAt: bids.createdAt,
              userId: bids.userId,
              userName: users.displayName,
              userAvatar: users.avatarUrl,
            })
            .from(bids)
            .innerJoin(users, eq(bids.userId, users.id))
            .where(eq(bids.taskId, taskId))
            .orderBy(bids.bidAmount)
            .all()
        : [];

    const referencedIds = [
      ...new Set(
        [task.assignedTo, task.claimedBy].filter(
          (value): value is string => value !== null
        )
      ),
    ];

    const userMap = new Map<string, { displayName: string; avatarUrl: string | null }>();
    if (referencedIds.length > 0) {
      const referencedUsers = db
        .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(inArray(users.id, referencedIds))
        .all();

      for (const u of referencedUsers) {
        userMap.set(u.id, { displayName: u.displayName, avatarUrl: u.avatarUrl });
      }
    }

    return NextResponse.json({
      ...task,
      bids: taskBids,
      assignedUser: task.assignedTo ? userMap.get(task.assignedTo) ?? null : null,
      claimedUser: task.claimedBy ? userMap.get(task.claimedBy) ?? null : null,
    });
  } catch (error) {
    console.error("Get task error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
