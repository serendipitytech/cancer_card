"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Gavel, CheckCircle, UserCheck, Clock, Award, XCircle, UserPlus } from "lucide-react";
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
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [showWinnerSelect, setShowWinnerSelect] = useState(false);
  const [isCardHolder, setIsCardHolder] = useState(false);
  const [showCloseOptions, setShowCloseOptions] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [crewMembers, setCrewMembers] = useState<Array<{ userId: string; displayName: string; avatarUrl: string | null }>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  function fetchTask() {
    fetch(`/api/tasks?status=`)
      .then((r) => r.json())
      .then((data) => {
        const found = data.tasks?.find((t: TaskDetail) => t.id === id);
        if (found) {
          setTask(found);
          // Calculate time remaining for auction
          if (found.requestMode === "auction" && found.auctionSettings?.endsAt) {
            const endsAt = new Date(found.auctionSettings.endsAt);
            const remaining = Math.max(0, endsAt.getTime() - Date.now());
            setTimeRemaining(remaining);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch user role and crew members
    fetch("/api/crews")
      .then((r) => r.json())
      .then((data) => {
        const activeCrew = data.crews?.find((c: any) => c.id === data.activeCrewId);
        if (activeCrew?.role === "card_holder" || activeCrew?.role === "admin") {
          setIsCardHolder(true);
          // Fetch crew members for assign dropdown
          fetch("/api/leaderboard")
            .then((r) => r.json())
            .then((lb) => {
              setCrewMembers(
                (lb.leaderboard || []).map((m: any) => ({
                  userId: m.userId,
                  displayName: m.displayName,
                  avatarUrl: m.avatarUrl,
                }))
              );
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchTask();
  }, [id]);

  // Countdown timer for auctions
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1000) {
          // Auction ended, refresh task
          fetchTask();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

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

  async function handleCloseTask(action: "complete" | "cancel", creditUserId?: string) {
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, creditUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast(
        "success",
        action === "complete" ? "Task completed!" : "Task closed."
      );
      setShowCloseOptions(false);
      setSelectedMemberId(null);
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to close task");
    }
    setSubmitting(false);
  }

  async function handleAssign(assigneeId: string) {
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: assigneeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast("success", "Task assigned!");
      setShowAssign(false);
      setSelectedMemberId(null);
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to assign");
    }
    setSubmitting(false);
  }

  async function handleCloseAuctionAuto() {
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/close-auction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast("success", "Auction closed! Lowest bidder wins.");
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to close auction");
    }
    setSubmitting(false);
  }

  async function handleSelectWinner() {
    if (!selectedBidId) return;
    setSubmitting(true);
    vibrate("medium");

    try {
      const res = await fetch(`/api/tasks/${id}/close-auction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", bidId: selectedBidId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      vibrate("success");
      addToast("success", "Winner selected!");
      setShowWinnerSelect(false);
      setSelectedBidId(null);
      fetchTask();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to select winner");
    }
    setSubmitting(false);
  }

  function formatTimeRemaining(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  if (loading || !task) {
    return (
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <div className="animate-shimmer h-48 rounded-card" />
      </div>
    );
  }

  const lowestBid = task.bids.length > 0 ? task.bids[0].bidAmount : task.pointCost;
  const auctionExpired = task.requestMode === "auction" && 
    task.auctionSettings?.endsAt && 
    new Date(task.auctionSettings.endsAt) < new Date();

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

      {/* Actions — Card Holder sees management controls */}
      {isCardHolder && task.status === "pending" && task.requestMode !== "auction" && (
        <div className="space-y-2">
          {!showAssign && !showCloseOptions && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="lg"
                onClick={() => setShowAssign(true)}
                disabled={crewMembers.length === 0}
              >
                <UserPlus className="w-5 h-5" />
                Assign
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                size="lg"
                onClick={() => setShowCloseOptions(true)}
              >
                <XCircle className="w-5 h-5" />
                Close Task
              </Button>
            </div>
          )}

          {/* Assign flow */}
          {showAssign && (
            <Card padding="md">
              <p className="text-sm font-semibold text-midnight mb-3">Assign to crew member</p>
              <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                {crewMembers.map((member) => (
                  <button
                    key={member.userId}
                    onClick={() => setSelectedMemberId(member.userId)}
                    className={`w-full flex items-center gap-2 rounded-lg p-2 text-left min-h-0 ${
                      selectedMemberId === member.userId
                        ? "bg-royal-100 ring-2 ring-royal"
                        : "hover:bg-royal-50"
                    }`}
                  >
                    <Avatar name={member.displayName} src={member.avatarUrl} size="sm" />
                    <span className="text-sm font-medium text-midnight">{member.displayName}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => { setShowAssign(false); setSelectedMemberId(null); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedMemberId}
                  loading={submitting}
                  onClick={() => selectedMemberId && handleAssign(selectedMemberId)}
                >
                  Assign
                </Button>
              </div>
            </Card>
          )}

          {/* Close flow */}
          {showCloseOptions && (
            <Card padding="md">
              <p className="text-sm font-semibold text-midnight mb-3">Close this task</p>
              <div className="space-y-2">
                <Button
                  variant="success"
                  className="w-full"
                  loading={submitting}
                  onClick={() => handleCloseTask("complete")}
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete (deduct points)
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  loading={submitting}
                  onClick={() => handleCloseTask("cancel")}
                >
                  <XCircle className="w-4 h-4" />
                  Cancel (no points)
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowCloseOptions(false)}
                >
                  Go Back
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Crew Member sees Claim */}
      {!isCardHolder && task.status === "pending" && task.requestMode !== "auction" && (
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

      {/* Card Holder: close claimed/in-progress tasks with credit */}
      {isCardHolder && (task.status === "claimed" || task.status === "in_progress") && (
        <div className="space-y-2">
          <Button
            variant="success"
            className="w-full"
            size="lg"
            loading={submitting}
            onClick={() => handleCloseTask("complete", task.claimedBy ?? undefined)}
          >
            <CheckCircle className="w-5 h-5" />
            Mark Complete
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            loading={submitting}
            onClick={() => handleCloseTask("cancel")}
          >
            <XCircle className="w-5 h-5" />
            Cancel Task
          </Button>
        </div>
      )}

      {/* Crew Member: mark their claimed task complete */}
      {!isCardHolder && (task.status === "claimed" || task.status === "in_progress") && (
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

          {/* Countdown Timer */}
          {timeRemaining !== null && timeRemaining > 0 && (
            <div className="flex items-center gap-2 mb-3 bg-royal-50 rounded-lg p-3">
              <Clock className="w-4 h-4 text-royal" />
              <span className="text-sm font-semibold text-royal">
                {formatTimeRemaining(timeRemaining)} remaining
              </span>
            </div>
          )}

          {auctionExpired && (
            <div className="mb-3 bg-warning-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-warning">
                ⏰ Auction ended
              </p>
            </div>
          )}

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
                  className={`flex items-center gap-2 rounded-lg p-2 ${
                    showWinnerSelect ? "cursor-pointer hover:bg-royal-50" : "bg-surface"
                  } ${selectedBidId === bid.id ? "bg-royal-100 ring-2 ring-royal" : ""}`}
                  onClick={() => showWinnerSelect && setSelectedBidId(bid.id)}
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

          {/* Card Holder Controls */}
          {isCardHolder && !auctionExpired && !showWinnerSelect && task.bids.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted font-semibold">Card Holder Controls</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  size="sm"
                  onClick={handleCloseAuctionAuto}
                  loading={submitting}
                >
                  <Award className="w-4 h-4" />
                  Award Lowest
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  size="sm"
                  onClick={() => setShowWinnerSelect(true)}
                >
                  <UserCheck className="w-4 h-4" />
                  Select Winner
                </Button>
              </div>
            </div>
          )}

          {/* Winner Selection Mode */}
          {showWinnerSelect && (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold text-midnight">
                Select a winner from the bids above
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowWinnerSelect(false);
                    setSelectedBidId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSelectWinner}
                  disabled={!selectedBidId}
                  loading={submitting}
                >
                  Confirm Winner
                </Button>
              </div>
            </div>
          )}

          {/* Place bid (non-Card Holders only) */}
          {!isCardHolder && !auctionExpired && (
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
          )}
        </Card>
      )}

      <div className="h-4" />
    </div>
  );
}
