import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  crews,
  crewMembers,
  tasks,
  bids,
  milestones,
} from "@/db/schema";
import { requireSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/user/export — data portability.
 *
 * Returns the signed-in user's own data as a JSON download: their profile, the
 * crews they belong to, the crews they card-hold, and the tasks, bids, and
 * milestones they authored. Scoped strictly to the caller (no other member's
 * personal data is included), which is also the tenancy boundary.
 */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const { allowed } = checkRateLimit("export-account", userId, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a bit and try again." },
        { status: 429 }
      );
    }

    const profile = db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const memberships = db
      .select({
        crewId: crewMembers.crewId,
        crewName: crews.name,
        role: crewMembers.role,
        joinedAt: crewMembers.joinedAt,
      })
      .from(crewMembers)
      .innerJoin(crews, eq(crewMembers.crewId, crews.id))
      .where(eq(crewMembers.userId, userId))
      .all();

    const cardHeldCrews = db
      .select({ id: crews.id, name: crews.name, createdAt: crews.createdAt })
      .from(crews)
      .where(eq(crews.cardHolderId, userId))
      .all();

    const authoredTasks = db
      .select()
      .from(tasks)
      .where(eq(tasks.createdBy, userId))
      .all();

    const authoredBids = db
      .select()
      .from(bids)
      .where(eq(bids.userId, userId))
      .all();

    const authoredMilestones = db
      .select()
      .from(milestones)
      .where(eq(milestones.userId, userId))
      .all();

    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      memberships,
      cardHeldCrews,
      tasks: authoredTasks,
      bids: authoredBids,
      milestones: authoredMilestones,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="cancer-card-export.json"',
      },
    });
  } catch (err) {
    console.error("Account export failed:", err);
    return NextResponse.json(
      { error: "We couldn't build your export. Please try again." },
      { status: 500 }
    );
  }
}
