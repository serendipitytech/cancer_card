"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Award, Flame, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CardSkeleton } from "@/components/ui/skeleton";
import { SuitIcon } from "@/components/cards/suit-icon";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  badges: string[];
  tasksCompleted: number;
  pointsSpent: number;
  auctionWins: number;
  currentStreak: number;
  score: number;
};

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Crew Leaderboard
          <SuitIcon suit="diamond" size="sm" className="ml-2 inline" />
        </h1>
        <p className="text-sm text-muted mt-1">
          The MVPs of your support crew
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : leaderboard.length === 0 ? (
        <Card variant="champagne" padding="lg" className="text-center">
          <Trophy className="w-12 h-12 text-royal-light mx-auto mb-3" />
          <p className="font-heading font-bold text-midnight">
            No rankings yet
          </p>
          <p className="text-sm text-muted mt-1">
            Once crew members start completing tasks, they&apos;ll show up here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card
                className={`${
                  index === 0
                    ? "ring-2 ring-warning bg-warning-light/30"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {index < 3 ? (
                      <span className="text-2xl">{medals[index]}</span>
                    ) : (
                      <span className="font-mono font-bold text-lg text-muted">
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar
                    name={entry.displayName}
                    src={entry.avatarUrl}
                    size="md"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-midnight truncate">
                      {entry.displayName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span className="flex items-center gap-0.5">
                        <Target className="w-3 h-3" />
                        {entry.tasksCompleted}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Award className="w-3 h-3" />
                        {entry.auctionWins}
                      </span>
                      {entry.currentStreak > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-warning" />
                          {entry.currentStreak}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold text-royal">
                      {entry.score}
                    </p>
                    <p className="text-[10px] text-muted">score</p>
                  </div>
                </div>

                {/* Badges */}
                {entry.badges.length > 0 && (
                  <div className="flex gap-1.5 mt-2 ml-11 flex-wrap">
                    {(entry.badges as string[]).map((badgeId) => {
                      const badge = BADGE_DEFINITIONS.find(
                        (b) => b.id === badgeId
                      );
                      return badge ? (
                        <span
                          key={badgeId}
                          title={`${badge.name}: ${badge.description}`}
                          className="text-lg cursor-help"
                        >
                          {badge.emoji}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
