"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserPlus, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuitIcon } from "@/components/cards/suit-icon";
import { useToast } from "@/components/ui/toast";
import { InviteShareActions } from "@/components/invite/invite-share-actions";

type Mode = "choose" | "create" | "join";

type OnboardingClientProps = {
  isAdditional: boolean;
};

export function OnboardingClient({ isAdditional }: OnboardingClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [mode, setMode] = useState<Mode>("choose");
  const [loading, setLoading] = useState(false);

  const [crewName, setCrewName] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");

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

  const heading = isAdditional ? "Add a Crew" : "Welcome";
  const subheading = isAdditional
    ? "Join an existing crew or start a new one"
    : "Let\u2019s get your support crew set up";

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-royal to-blush mb-4">
          <SuitIcon suit="spade" size="lg" className="text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-3xl text-midnight">
          {heading}
        </h1>
        <p className="text-muted mt-1">{subheading}</p>
        {isAdditional && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-royal font-semibold mt-3 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        )}
      </div>

      <AnimatePresence mode="wait">
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
              <div className="bg-surface rounded-xl p-4 flex items-center justify-center">
                <span className="font-mono font-bold text-3xl text-royal tracking-[0.3em]">
                  {createdInviteCode}
                </span>
              </div>
              <div className="mt-4">
                <InviteShareActions
                  inviteCode={createdInviteCode}
                  crewName={crewName}
                  variant="full"
                />
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
