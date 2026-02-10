"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, Copy, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuitIcon } from "@/components/cards/suit-icon";
import { useToast } from "@/components/ui/toast";

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);

  // Create crew
  const [crewName, setCrewName] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");

  // Join crew
  const [inviteCode, setInviteCode] = useState("");

  async function handleCreateCrew() {
    if (!crewName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: crewName, initialPoints: 500 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const crew = await res.json();
      setCreatedInviteCode(crew.inviteCode);
      addToast("success", `${crewName} is ready to roll!`);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to create crew");
    }
    setLoading(false);
  }

  async function handleJoinCrew() {
    if (!inviteCode.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/crews/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      addToast("success", "Welcome to the crew!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Failed to join crew");
    }
    setLoading(false);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(createdInviteCode);
      addToast("success", "Invite code copied!");
    } catch {
      addToast("info", `Share this code: ${createdInviteCode}`);
    }
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-royal to-blush mb-4">
          <SuitIcon suit="spade" size="lg" className="text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-3xl text-midnight">
          Welcome
        </h1>
        <p className="text-muted mt-1">
          Let&apos;s get your support crew set up
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Choose: Create or Join */}
        {mode === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <button onClick={() => setMode("create")} className="w-full min-h-0 min-w-0">
              <Card className="flex items-center gap-4 hover:shadow-card-hover transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-royal to-blush flex items-center justify-center flex-shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-heading font-bold text-midnight text-lg">
                    I&apos;m the Patient
                  </p>
                  <p className="text-sm text-muted">
                    Create your crew and invite your people
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted" />
              </Card>
            </button>

            <button onClick={() => setMode("join")} className="w-full min-h-0 min-w-0">
              <Card className="flex items-center gap-4 hover:shadow-card-hover transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-royal-50 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-7 h-7 text-royal" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-heading font-bold text-midnight text-lg">
                    I&apos;m the Support
                  </p>
                  <p className="text-sm text-muted">
                    Join a crew with an invite code
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted" />
              </Card>
            </button>
          </motion.div>
        )}

        {/* Create Crew */}
        {mode === "create" && !createdInviteCode && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card padding="lg">
              <h2 className="font-heading font-bold text-xl text-midnight mb-4">
                Name Your Crew
              </h2>
              <Input
                label="Crew Name"
                placeholder='e.g., "Team Sarah" or "The Avengers"'
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
              />
              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  loading={loading}
                  onClick={handleCreateCrew}
                  disabled={!crewName.trim()}
                >
                  Create Crew
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Created — show invite code */}
        {mode === "create" && createdInviteCode && (
          <motion.div
            key="created"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 text-center"
          >
            <Card variant="accent" padding="lg">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="font-heading font-bold text-xl text-midnight mb-2">
                {crewName} is Live!
              </h2>
              <p className="text-sm text-muted mb-4">
                Share this code with your crew so they can join:
              </p>
              <div className="bg-surface rounded-xl p-4 flex items-center justify-center gap-3">
                <span className="font-mono font-bold text-3xl text-royal tracking-[0.3em]">
                  {createdInviteCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-lg hover:bg-royal-50 min-h-0 min-w-0"
                >
                  <Copy className="w-5 h-5 text-royal" />
                </button>
              </div>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                router.push("/dashboard");
                router.refresh();
              }}
            >
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        )}

        {/* Join Crew */}
        {mode === "join" && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card padding="lg">
              <h2 className="font-heading font-bold text-xl text-midnight mb-4">
                Enter Invite Code
              </h2>
              <Input
                label="Invite Code"
                placeholder="XXXXXXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono text-center text-xl tracking-[0.3em]"
              />
              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  loading={loading}
                  onClick={handleJoinCrew}
                  disabled={inviteCode.length !== 8}
                >
                  Join Crew
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
