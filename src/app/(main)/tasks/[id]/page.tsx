"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Gavel, CheckCircle, UserCheck, Clock } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { SuitIcon } from "@/components/cards/suit-icon";
import { useToast } from "@/components/ui/toast";
import { useHaptics } from "@/hooks/use-haptics";
import { useSSE } from "@/hooks/use-sse";
import { timeAgo, getUrgencyLabel } from "@/lib/utils";

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  pointCost: number;
  requestMode: string;
  status: string;
  urgency: string;
  createdAt: string;
  claimedBy: string | null;
  assignedTo: string | null;
  finalPointCost: number | null;
  auctionSettings: { minBid?: number; durationMinutes?: number; endsAt?: string } | null;
  claimedUser: { displayName: string; avatarUrl: string | null } | null;
  assignedUser: { displayName: string; avatarUrl: string | null } | null;
  bids: Array<{
    id: string;
    bidAmount: number;
    comment: string | null;
    createdAt: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
  }>;
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { vibrate } = useHaptics();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState("");
  const [bidComment, setBidComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function fetchTask() {
    fetch(`/api/tasks?status=`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.tasks?.find((t: TaskDetail) => t.id === id);
        if (found) setTask(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchTask();
  }, [id]);

  useSSE({
    url: "/api/feed/stream",
    enabled: task?.requestMode === "auction" && task?.status === "pending",
    onMessage: () => {
      fetchTask();
    },
  });

  async function handleClaim() {
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/claim`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast("success", "Task claimed! You're a hero.");
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to claim");
    }
    setSubmitting(false);
  }

  async function handleComplete() {
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast("success", "Task complete! Points deducted.");
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to complete");
    }
    setSubmitting(false);
  }

  async function handleBid() {
    if (!bidAmount) return;
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidAmount: parseInt(bidAmount),
          comment: bidComment || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast("success", "Bid placed!");
      setBidAmount("");
      setBidComment("");
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to place bid");
    }
    setSubmitting(false);
  }

  if (loading || !task) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="animate-shimmer h-48 rounded-card" />
      </div>
    );
  }

  const lowestBid = task.bids.length > 0 ? task.bids[0].bidAmount : task.pointCost;

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-royal-50 min-h-0 min-w-0"
        >
          <ArrowLeft className="w-5 h-5 text-midnight" />
        </button>
        <h1 className="font-heading font-extrabold text-xl text-midnight flex-1">
          Task Details
        </h1>
      </div>

      {/* Task Card */}
      <Card variant="elevated" padding="lg">
        <div className="text-center mb-4">
          <h2 className="font-heading font-extrabold text-2xl text-midnight">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-sm text-muted mt-1">{task.description}</p>
          )}
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="points">
            {task.finalPointCost ?? task.pointCost} pts
          </Badge>
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
          <Badge variant="muted">{task.category}</Badge>
        </div>

        {task.claimedUser && (
          <div className="flex items-center gap-2 mt-4 justify-center">
            <Avatar
              name={task.claimedUser.displayName}
              src={task.claimedUser.avatarUrl}
              size="sm"
            />
            <span className="text-sm font-medium text-midnight">
              {task.claimedUser.displayName}
            </span>
            <Badge variant="success">claimed</Badge>
          </div>
        )}
      </Card>

      {/* Actions */}
      {task.status === "pending" && task.requestMode !== "auction" && (
        <Button
          className="w-full"
          size="lg"
          loading={submitting}
          onClick={handleClaim}
        >
          <UserCheck className="w-5 h-5" />
          Claim This Task
        </Button>
      )}

      {(task.status === "claimed" || task.status === "in_progress") && (
        <Button
          variant="success"
          className="w-full"
          size="lg"
          loading={submitting}
          onClick={handleComplete}
        >
          <CheckCircle className="w-5 h-5" />
          Mark Complete
        </Button>
      )}

      {/* Auction Section */}
      {task.requestMode === "auction" && task.status === "pending" && (
        <Card variant="accent" padding="lg">
          <div className="flex items-center gap-2 mb-4">
            <Gavel className="w-5 h-5 text-royal" />
            <CardTitle>Reverse Auction</CardTitle>
          </div>

          <p className="text-sm text-muted mb-3">
            Current lowest bid: <strong className="text-royal font-mono">{lowestBid} pts</strong>
          </p>

          {/* Bid list */}
          {task.bids.length > 0 && (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {task.bids.map((bid, i) => (
                <motion.div
                  key={bid.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 bg-surface rounded-lg p-2"
                >
                  <Avatar name={bid.userName} src={bid.userAvatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-midnight">
                      {bid.userName}
                    </p>
                    {bid.comment && (
                      <p className="text-xs text-muted truncate">{bid.comment}</p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-royal">
                    {bid.bidAmount} pts
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Place bid */}
          <div className="space-y-2">
            <Input
              label="Your bid (points)"
              type="number"
              placeholder={`Lower than ${lowestBid}`}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <Input
              label="Trash talk (optional)"
              placeholder="I'm already at Walgreens..."
              value={bidComment}
              onChange={(e) => setBidComment(e.target.value)}
            />
            <Button
              className="w-full"
              loading={submitting}
              onClick={handleBid}
              disabled={!bidAmount || parseInt(bidAmount) >= lowestBid}
            >
              <Gavel className="w-4 h-4" />
              Place Bid
            </Button>
          </div>
        </Card>
      )}

      <div className="h-4" />
    </div>
  );
}
