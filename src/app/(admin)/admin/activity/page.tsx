import { getGlobalActivity } from "@/lib/admin-queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EVENT_EMOJIS } from "@/lib/event-emojis";
import { timeAgo } from "@/lib/utils";

function getEventDescription(
  eventType: string,
  data: Record<string, unknown> | null
): string {
  switch (eventType) {
    case "task_created":
      return `played their cancer card: "${data?.taskTitle ?? "a task"}"`;
    case "task_claimed":
      return `claimed "${data?.taskTitle ?? "a task"}"`;
    case "task_completed":
      return `completed "${data?.taskTitle ?? "a task"}"`;
    case "bid_placed":
      return `bid ${data?.bidAmount ?? "?"} pts on "${data?.taskTitle ?? "a task"}"`;
    case "auction_won":
      return `won the auction for "${data?.taskTitle ?? "a task"}" at ${data?.winningBid ?? "?"} pts`;
    case "milestone_logged":
      return `logged self-care: ${data?.routineName ?? data?.milestoneType ?? "milestone"}. +${data?.pointsEarned ?? 0} pts`;
    case "badge_earned":
      return "earned a new badge";
    case "member_joined":
      return "joined the crew";
    default:
      return eventType.replaceAll("_", " ");
  }
}

export default function AdminActivityPage() {
  const activity = getGlobalActivity(100);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Activity
        </h1>
        <Badge variant="muted">{activity.length} entries</Badge>
      </div>

      {activity.length === 0 ? (
        <Card variant="champagne" padding="lg" className="text-center">
          <p className="text-sm text-muted">No activity yet.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-royal-100/50">
            {activity.map((entry) => (
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
                    {getEventDescription(entry.eventType, entry.data)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="muted">{entry.crewName}</Badge>
                    <span className="text-xs text-muted">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
