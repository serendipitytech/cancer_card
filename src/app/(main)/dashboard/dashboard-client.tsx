"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Zap,
  Heart,
  ClipboardList,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PointDisplay } from "@/components/cards/point-display";
import { SuitIcon } from "@/components/cards/suit-icon";
import { InviteShareActions } from "@/components/invite/invite-share-actions";
import { CrewSwitcher } from "@/components/ui/crew-switcher";
import { useTour } from "@/hooks/use-tour";
import { TourOverlay } from "@/components/tour/tour-overlay";
import { timeAgo, getUrgencyLabel } from "@/lib/utils";

type DashboardProps = {
  userName: string;
  crewName: string;
  pointBalance: number;
  role: string;
  inviteCode: string;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    urgency: string;
    requestMode: string;
    createdAt: Date;
  }>;
  recentFeed: Array<{
    id: string;
    eventType: string;
    data: unknown;
    createdAt: Date;
    actorName: string;
  }>;
  todayMilestoneCount: number;
  hasSeenTour: boolean;
  allCrews: Array<{ id: string; name: string; role: string }>;
  activeCrewId: string;
};

export function DashboardClient({
  userName,
  crewName,
  pointBalance,
  role,
  inviteCode,
  recentTasks,
  recentFeed,
  todayMilestoneCount,
  hasSeenTour,
  allCrews,
  activeCrewId,
}: DashboardProps) {
  const tour = useTour(hasSeenTour);

  const isCardHolder = role === "card_holder" || role === "admin";

  return (
    <div className="px-4 pt-6 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <CrewSwitcher crews={allCrews} activeCrewId={activeCrewId} />
          <h1 className="font-heading font-extrabold text-2xl text-midnight">
            Hey, {userName.split(" ")[0]}
            <SuitIcon suit="heart" size="sm" className="ml-1.5 inline-block" />
          </h1>
        </div>
      </motion.div>

      {/* Point Balance Card */}
      {isCardHolder && (
        <motion.div
          data-tour="point-bank"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="accent" padding="lg" className="text-center">
            <p className="text-sm font-heading font-semibold text-royal-light mb-1">
              Point Bank
            </p>
            <PointDisplay points={pointBalance} size="xl" showLabel={false} />
            <p className="text-xs text-muted mt-2">
              {pointBalance >= 0
                ? "Spend freely. Your crew has your back."
                : "In the red, but that's OK. Self-care earns it back."}
            </p>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        data-tour="quick-actions"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3"
      >
        {isCardHolder ? (
          <>
            <Link href="/play-card">
              <Card
                className="flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-royal to-blush flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-heading font-bold text-midnight">
                  Play Card
                </span>
              </Card>
            </Link>
            <Link href="/self-care">
              <Card
                className="flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-full bg-success/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-success" />
                </div>
                <span className="text-xs font-heading font-bold text-midnight">
                  Self-Care
                </span>
                {todayMilestoneCount > 0 && (
                  <Badge variant="success" className="text-[10px]">
                    {todayMilestoneCount} today
                  </Badge>
                )}
              </Card>
            </Link>
            <Link href="/tasks">
              <Card
                className="flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-full bg-royal-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-royal" />
                </div>
                <span className="text-xs font-heading font-bold text-midnight">
                  My Requests
                </span>
              </Card>
            </Link>
          </>
        ) : (
          <>
            <Link href="/tasks">
              <Card
                className="flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition-shadow col-span-2"
              >
                <div className="w-11 h-11 rounded-full bg-royal-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-royal" />
                </div>
                <span className="text-xs font-heading font-bold text-midnight">
                  Task Board
                </span>
              </Card>
            </Link>
            <Link href="/leaderboard">
              <Card
                className="flex flex-col items-center gap-2 py-4 hover:shadow-card-hover transition-shadow"
              >
                <div className="w-11 h-11 rounded-full bg-warning/10 flex items-center justify-center">
                  <span className="text-lg">🏆</span>
                </div>
                <span className="text-xs font-heading font-bold text-midnight">
                  Rankings
                </span>
              </Card>
            </Link>
          </>
        )}
      </motion.div>

      {/* Invite Card */}
      <motion.div
        data-tour="invite-code"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted font-medium">Invite Code</p>
            <p className="font-mono font-bold text-lg text-royal tracking-wider">
              {inviteCode}
            </p>
          </div>
          <InviteShareActions
            inviteCode={inviteCode}
            crewName={crewName}
            variant="compact"
          />
        </Card>
      </motion.div>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <motion.div
          data-tour="recent-tasks"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading font-bold text-midnight">
              Recent {isCardHolder ? "Requests" : "Tasks"}
            </h2>
            <Link
              href="/tasks"
              className="text-royal text-sm font-semibold flex items-center gap-0.5 min-h-0 min-w-0"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.slice(0, 3).map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <Card className="flex items-center justify-between hover:shadow-card-hover transition-shadow">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-midnight text-sm truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted">
                      {getUrgencyLabel(task.urgency)} &middot; {timeAgo(task.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      task.status === "completed"
                        ? "success"
                        : task.status === "pending"
                        ? "warning"
                        : "default"
                    }
                  >
                    {task.status}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Activity Feed Preview */}
      {recentFeed.length > 0 && (
        <motion.div
          data-tour="activity-feed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading font-bold text-midnight">Activity</h2>
            <Link
              href="/feed"
              className="text-royal text-sm font-semibold flex items-center gap-0.5 min-h-0 min-w-0"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <Card padding="sm">
            <div className="space-y-2">
              {recentFeed.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 text-sm py-1.5"
                >
                  <span className="text-muted text-xs whitespace-nowrap">
                    {timeAgo(entry.createdAt)}
                  </span>
                  <p className="text-ink">
                    <span className="font-semibold">{entry.actorName}</span>{" "}
                    {getFeedEventText(entry.eventType, entry.data as Record<string, unknown>)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center pt-2"
      >
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-muted hover:text-danger transition-colors py-2 px-4 rounded-lg min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </motion.div>

      {/* Spacer for tab bar */}
      <div className="h-4" />

      <TourOverlay
        isActive={tour.isActive}
        currentStep={tour.currentStep}
        currentStepIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        targetRect={tour.targetRect}
        onNext={tour.next}
        onSkip={tour.skip}
      />
    </div>
  );
}

function getFeedEventText(eventType: string, data: Record<string, unknown>): string {
  switch (eventType) {
    case "task_created":
      return `played their card: "${data?.taskTitle || "a task"}"`;
    case "task_claimed":
      return `claimed "${data?.taskTitle || "a task"}"`;
    case "task_completed":
      return `completed "${data?.taskTitle || "a task"}"`;
    case "bid_placed":
      return `bid ${data?.bidAmount || "?"} pts on "${data?.taskTitle || "a task"}"`;
    case "auction_won":
      return `won the auction for "${data?.taskTitle || "a task"}"`;
    case "milestone_logged":
      return `logged: ${data?.routineName || data?.milestoneType || "a milestone"}`;
    case "badge_earned":
      return `earned a new badge!`;
    case "member_joined":
      return `joined the crew!`;
    default:
      return "did something";
  }
}
