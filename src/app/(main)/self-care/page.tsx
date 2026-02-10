"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Flame, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuitIcon } from "@/components/cards/suit-icon";
import { useToast } from "@/components/ui/toast";
import { useHaptics } from "@/hooks/use-haptics";
import { timeAgo } from "@/lib/utils";

type Routine = {
  id: string;
  name: string;
  milestoneType: string;
  pointValue: number;
  emoji: string;
};

type MilestoneEntry = {
  id: string;
  milestoneType: string;
  pointsEarned: number;
  note: string | null;
  isStreakBonus: boolean;
  loggedAt: string;
};

export default function SelfCarePage() {
  const { addToast } = useToast();
  const { vibrate } = useHaptics();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [milestones, setMilestones] = useState<MilestoneEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingType, setLoggingType] = useState<string | null>(null);
  const [pointsAnimation, setPointsAnimation] = useState<{ points: number; id: string } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/milestones")
      .then((r) => r.json())
      .then((data) => {
        setRoutines(data.routines || []);
        setMilestones(data.milestones || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function logMilestone(routine: Routine) {
    setLoggingType(routine.milestoneType);
    vibrate("medium");

    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneType: routine.milestoneType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();
      vibrate("success");

      setPointsAnimation({ points: data.pointsEarned, id: crypto.randomUUID() });
      setTimeout(() => setPointsAnimation(null), 1500);

      addToast("points", `${routine.name}`, data.pointsEarned);

      if (data.streakBonus > 0) {
        setTimeout(() => {
          addToast("points", `Streak bonus!`, data.streakBonus);
        }, 800);
      }

      // Refresh milestones
      const refreshRes = await fetch("/api/milestones");
      const refreshData = await refreshRes.json();
      setMilestones(refreshData.milestones || []);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to log");
    }

    setLoggingType(null);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMilestones = milestones.filter(
    (m) => new Date(m.loggedAt) >= todayStart && !m.isStreakBonus
  );
  const todayTypes = new Set(todayMilestones.map((m) => m.milestoneType));

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-midnight">
            Self-Care
            <SuitIcon suit="heart" size="sm" className="ml-2 inline" />
          </h1>
          <p className="text-sm text-muted">
            Log your wins. Earn points. Crush it.
          </p>
        </div>
      </div>

      {/* Today's progress */}
      <Card variant="accent" padding="md" className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-heading font-semibold text-royal">
              Today&apos;s Progress
            </p>
            <p className="text-2xl font-heading font-extrabold text-midnight">
              {todayMilestones.length} / {routines.length}
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-royal/10 flex items-center justify-center">
            {todayMilestones.length >= routines.length ? (
              <span className="text-3xl">🎉</span>
            ) : (
              <Heart className="w-7 h-7 text-royal" />
            )}
          </div>
        </div>
        <div className="flex gap-1 mt-3">
          {routines.map((r) => (
            <div
              key={r.id}
              className={`h-2 flex-1 rounded-full transition-colors ${
                todayTypes.has(r.milestoneType) ? "bg-success" : "bg-royal-200"
              }`}
            />
          ))}
        </div>
      </Card>

      {/* Milestone buttons */}
      <div className="space-y-2 mb-6">
        {routines.map((routine) => {
          const loggedToday = todayTypes.has(routine.milestoneType);
          const isLogging = loggingType === routine.milestoneType;

          return (
            <motion.button
              key={routine.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => logMilestone(routine)}
              disabled={isLogging}
              className="w-full min-h-0 min-w-0 relative"
            >
              <Card
                className={`flex items-center gap-3 transition-all ${
                  loggedToday
                    ? "bg-success-light border border-success/20"
                    : "hover:shadow-card-hover"
                }`}
              >
                <span className="text-2xl flex-shrink-0">{routine.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="font-heading font-bold text-sm text-midnight">
                    {routine.name}
                  </p>
                  {loggedToday && (
                    <p className="text-xs text-success font-medium">
                      Logged today
                    </p>
                  )}
                </div>
                <Badge variant={loggedToday ? "success" : "points"}>
                  +{routine.pointValue}
                </Badge>
                {isLogging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-card">
                    <svg className="animate-spin w-5 h-5 text-royal" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
              </Card>

              {/* Points animation */}
              <AnimatePresence>
                {pointsAnimation && loggingType === routine.milestoneType && (
                  <motion.div
                    key={pointsAnimation.id}
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -30, scale: 1.2 }}
                    exit={{ opacity: 0, y: -60 }}
                    className="absolute right-4 top-0 font-mono font-bold text-xl text-royal pointer-events-none"
                  >
                    +{routine.pointValue}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Recent history */}
      {milestones.length > 0 && (
        <div>
          <h2 className="font-heading font-bold text-midnight mb-2">
            Recent
          </h2>
          <div className="space-y-1.5">
            {milestones.slice(0, 10).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 text-sm py-1.5"
              >
                <span className="text-xs text-muted w-14 flex-shrink-0">
                  {timeAgo(new Date(m.loggedAt))}
                </span>
                <p className="flex-1 text-ink">
                  {m.isStreakBonus ? (
                    <span className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-warning inline" />
                      {m.note || "Streak bonus"}
                    </span>
                  ) : (
                    m.milestoneType
                  )}
                </p>
                <Badge variant={m.isStreakBonus ? "warning" : "success"}>
                  +{m.pointsEarned}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
