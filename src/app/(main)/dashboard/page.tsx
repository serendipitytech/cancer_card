import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserCrews, resolveActiveCrew } from "@/lib/session";
import { db } from "@/db";
import { tasks, milestones, activityFeed, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allCrews = getUserCrews(session.user.id);

  if (allCrews.length === 0) {
    redirect("/onboarding");
  }

  const crew = await resolveActiveCrew(allCrews);

  if (!crew) {
    redirect("/onboarding");
  }

  const user = db
    .select({ hasSeenTour: users.hasSeenTour })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();

  const recentTasks = db
    .select()
    .from(tasks)
    .where(eq(tasks.crewId, crew.crewId))
    .orderBy(desc(tasks.createdAt))
    .limit(5)
    .all();

  const recentFeed = db
    .select({
      id: activityFeed.id,
      eventType: activityFeed.eventType,
      data: activityFeed.data,
      createdAt: activityFeed.createdAt,
      actorName: users.displayName,
    })
    .from(activityFeed)
    .innerJoin(users, eq(activityFeed.actorId, users.id))
    .where(eq(activityFeed.crewId, crew.crewId))
    .orderBy(desc(activityFeed.createdAt))
    .limit(5)
    .all();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayMilestones = db
    .select()
    .from(milestones)
    .where(
      and(
        eq(milestones.crewId, crew.crewId),
        eq(milestones.userId, session.user.id)
      )
    )
    .orderBy(desc(milestones.loggedAt))
    .limit(20)
    .all()
    .filter((m) => m.loggedAt >= todayStart);

  return (
    <DashboardClient
      userName={session.user.name || "Friend"}
      crewName={crew.crewName}
      pointBalance={crew.pointBalance}
      role={crew.role}
      inviteCode={crew.inviteCode}
      recentTasks={recentTasks}
      recentFeed={recentFeed}
      todayMilestoneCount={todayMilestones.length}
      hasSeenTour={user?.hasSeenTour ?? false}
      allCrews={allCrews.map((c) => ({
        id: c.crewId,
        name: c.crewName,
        role: c.role,
      }))}
      activeCrewId={crew.crewId}
    />
  );
}
