"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/skeleton";
import { SuitIcon } from "@/components/cards/suit-icon";
import { useSSE } from "@/hooks/use-sse";
import { timeAgo } from "@/lib/utils";

type FeedEntry = {
  id: string;
  eventType: string;
  data: Record<string, unknown>;
  createdAt: string;
  actorId: string;
  actorName: string;
  actorAvatar: string | null;
};

const EVENT_EMOJIS: Record<string, string> = {
  task_created: "🃏",
  task_claimed: "🙋",
  task_completed: "✅",
  bid_placed: "💰",
  auction_won: "🏆",
  milestone_logged: "💪",
  badge_earned: "🎖️",
  member_joined: "👋",
};

function getEventText(eventType: string, data: Record<string, unknown>): string {
  switch (eventType) {
    case "task_created":
      return `played their cancer card: "${data?.taskTitle || "a task"}"`;
    case "task_claimed":
      return `claimed "${data?.taskTitle || "a task"}"`;
    case "task_completed":
      return `completed "${data?.taskTitle || "a task"}" — legend status`;
    case "bid_placed":
      return `bid ${data?.bidAmount || "?"} pts on "${data?.taskTitle || "a task"}"${data?.comment ? ` — "${data.comment}"` : ""}`;
    case "auction_won":
      return `won the auction for "${data?.taskTitle || "a task"}" at ${data?.winningBid || "?"} pts`;
    case "milestone_logged":
      return `logged: ${data?.routineName || data?.milestoneType || "self-care"}. +${data?.pointsEarned || 0} pts`;
    case "badge_earned":
      return "earned a new badge!";
    case "member_joined":
      return "joined the crew! Welcome aboard!";
    default:
      return "did something awesome";
  }
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setFeed(data.feed || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSSEMessage = useCallback((data: unknown) => {
    const typed = data as { type: string; entries?: FeedEntry[] };
    if (typed.type === "updates" && typed.entries) {
      setFeed((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newEntries = typed.entries!.filter(
          (e) => !existingIds.has(e.id)
        );
        return [...newEntries, ...prev];
      });
    }
  }, []);

  useSSE({
    url: "/api/feed/stream",
    onMessage: handleSSEMessage,
  });

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Activity
          <SuitIcon suit="club" size="sm" className="ml-2 inline" />
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : feed.length === 0 ? (
        <Card variant="champagne" padding="lg" className="text-center">
          <Activity className="w-12 h-12 text-royal-light mx-auto mb-3" />
          <p className="font-heading font-bold text-midnight">
            Nothing here yet
          </p>
          <p className="text-sm text-muted mt-1">
            Activity from the crew will show up here in real time.
          </p>
        </Card>
      ) : (
        <div className="space-y-1">
          {feed.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              className="flex gap-3 py-3 border-b border-royal-100/50 last:border-0"
            >
              <Avatar
                name={entry.actorName}
                src={entry.actorAvatar}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-relaxed">
                  <span className="mr-1.5">
                    {EVENT_EMOJIS[entry.eventType] || "✨"}
                  </span>
                  <span className="font-semibold text-midnight">
                    {entry.actorName}
                  </span>{" "}
                  {getEventText(entry.eventType, entry.data as Record<string, unknown>)}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {timeAgo(new Date(entry.createdAt))}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
