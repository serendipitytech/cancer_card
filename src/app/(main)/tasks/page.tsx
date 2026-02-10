"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Filter, Clock, CheckCircle, Gavel } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { SuitIcon } from "@/components/cards/suit-icon";
import { timeAgo, getUrgencyLabel } from "@/lib/utils";

type TaskItem = {
  id: string;
  title: string;
  category: string;
  pointCost: number;
  requestMode: string;
  status: string;
  urgency: string;
  createdAt: string;
  claimedUser: { displayName: string } | null;
  assignedUser: { displayName: string } | null;
  bids: Array<{ bidAmount: number }>;
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Open" },
  { value: "claimed", label: "Claimed" },
  { value: "completed", label: "Done" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const url = filter ? `/api/tasks?status=${filter}` : "/api/tasks";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Tasks
          <SuitIcon suit="club" size="sm" className="ml-2 inline" />
        </h1>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar -mx-4 px-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-pill text-sm font-heading font-semibold whitespace-nowrap transition-colors min-h-[36px] min-w-0 ${
              filter === f.value
                ? "bg-royal text-white"
                : "bg-royal-50 text-royal"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : tasks.length === 0 ? (
        <Card variant="champagne" padding="lg" className="text-center">
          <SuitIcon suit="diamond" size="xl" className="opacity-20 block mx-auto mb-3" />
          <p className="font-heading font-bold text-midnight">
            No tasks yet
          </p>
          <p className="text-sm text-muted mt-1">
            {filter
              ? "Nothing matches this filter. Try another!"
              : "Your crew is standing by. Play a card to get things rolling."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3 card-stagger">
          {tasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`}>
              <motion.div whileTap={{ scale: 0.98 }}>
                <Card className="hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-midnight truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {task.category} &middot; {timeAgo(new Date(task.createdAt))}
                      </p>
                    </div>
                    <Badge variant="points">{task.pointCost} pts</Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={
                        task.status === "completed"
                          ? "success"
                          : task.status === "claimed"
                          ? "default"
                          : "warning"
                      }
                    >
                      {task.status === "pending" ? "open" : task.status}
                    </Badge>

                    <Badge
                      variant={
                        task.urgency === "asap"
                          ? "danger"
                          : task.urgency === "today"
                          ? "warning"
                          : "muted"
                      }
                    >
                      {getUrgencyLabel(task.urgency)}
                    </Badge>

                    {task.requestMode === "auction" && (
                      <Badge variant="default">
                        <Gavel className="w-3 h-3" />
                        {task.bids.length} bid{task.bids.length !== 1 ? "s" : ""}
                      </Badge>
                    )}

                    {task.claimedUser && (
                      <span className="text-xs text-muted">
                        {task.claimedUser.displayName}
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
