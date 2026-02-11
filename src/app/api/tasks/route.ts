import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, crewMembers, users, bids } from "@/db/schema";
import { createTaskSchema } from "@/lib/validators";
import { eq, and, desc } from "drizzle-orm";
import { logActivity } from "@/lib/points";
import { getUserCrew } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserCrew(session.user.id);
    if (!crew) {
      return NextResponse.json(
        { error: "You're not in a crew yet" },
        { status: 403 }
      );
    }

    if (crew.role !== "card_holder" && crew.role !== "admin") {
      return NextResponse.json(
        { error: "Only the Card Holder or Admin can play cards" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const auctionSettings = parsed.data.requestMode === "auction" && parsed.data.auctionSettings
      ? {
          ...parsed.data.auctionSettings,
          endsAt: new Date(
            Date.now() + (parsed.data.auctionSettings.durationMinutes || 60) * 60 * 1000
          ).toISOString(),
        }
      : null;

    const task = db
      .insert(tasks)
      .values({
        crewId: crew.crewId,
        createdBy: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category,
        pointCost: parsed.data.pointCost,
        requestMode: parsed.data.requestMode,
        assignedTo: parsed.data.assignedTo || null,
        urgency: parsed.data.urgency,
        dueBy: parsed.data.dueBy ? new Date(parsed.data.dueBy) : null,
        auctionSettings,
      })
      .returning()
      .get();

    logActivity(crew.crewId, "task_created", session.user.id, {
      taskId: task.id,
      taskTitle: task.title,
      mode: task.requestMode,
      pointCost: task.pointCost,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crew = await getUserCrew(session.user.id);
    if (!crew) {
      return NextResponse.json({ tasks: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const allTasks = db
      .select()
      .from(tasks)
      .where(
        status
          ? and(eq(tasks.crewId, crew.crewId), eq(tasks.status, status as "pending"))
          : eq(tasks.crewId, crew.crewId)
      )
      .orderBy(desc(tasks.createdAt))
      .all();

    const tasksWithDetails = allTasks.map((task) => {
      const taskBids = task.requestMode === "auction"
        ? db
            .select({
              id: bids.id,
              bidAmount: bids.bidAmount,
              comment: bids.comment,
              createdAt: bids.createdAt,
              userId: bids.userId,
              userName: users.displayName,
              userAvatar: users.avatarUrl,
            })
            .from(bids)
            .innerJoin(users, eq(bids.userId, users.id))
            .where(eq(bids.taskId, task.id))
            .orderBy(bids.bidAmount)
            .all()
        : [];

      const assignedUser = task.assignedTo
        ? db
            .select({ displayName: users.displayName, avatarUrl: users.avatarUrl })
            .from(users)
            .where(eq(users.id, task.assignedTo))
            .get()
        : null;

      const claimedUser = task.claimedBy
        ? db
            .select({ displayName: users.displayName, avatarUrl: users.avatarUrl })
            .from(users)
            .where(eq(users.id, task.claimedBy))
            .get()
        : null;

      return {
        ...task,
        bids: taskBids,
        assignedUser,
        claimedUser,
      };
    });

    return NextResponse.json({ tasks: tasksWithDetails });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
