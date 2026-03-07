import { getOverviewStats, getGlobalActivity } from "@/lib/admin-queries";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { EVENT_EMOJIS } from "@/lib/event-emojis";
import { timeAgo } from "@/lib/utils";

export default function AdminOverviewPage() {
  const stats = getOverviewStats();
  const recentActivity = getGlobalActivity(10);

  return (
    <div>
      <h1 className="font-heading font-extrabold text-2xl text-midnight mb-6">
        Overview
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Total Crews" value={stats.totalCrews} />
        <StatCard
          label="Active Tasks"
          value={stats.activeTasks}
          subtitle={`+${stats.recentTasks} this week`}
        />
        <StatCard label="Completed Tasks" value={stats.completedTasks} />
        <StatCard label="Milestones Logged" value={stats.totalMilestones} />
        <StatCard
          label="Recent Signups"
          value={stats.recentSignups}
          subtitle="Last 7 days"
        />
      </div>

      <h2 className="font-heading font-bold text-lg text-midnight mb-4">
        Recent Activity
      </h2>

      {recentActivity.length === 0 ? (
        <Card variant="champagne" padding="lg" className="text-center">
          <p className="text-sm text-muted">No activity yet.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-royal-100/50">
            {recentActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span className="text-lg leading-none mt-0.5">
                  {EVENT_EMOJIS[entry.eventType] ?? "✨"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-semibold text-midnight">
                      {entry.actorName}
                    </span>{" "}
                    <span className="text-muted">in</span>{" "}
                    <span className="font-medium text-midnight">
                      {entry.crewName}
                    </span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {entry.eventType.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
