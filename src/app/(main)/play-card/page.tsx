"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Send, Gavel, Users, UserCheck, Zap } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SuitIcon } from "@/components/cards/suit-icon";
import { useToast } from "@/components/ui/toast";
import { useHaptics } from "@/hooks/use-haptics";

type Template = {
  id: string;
  title: string;
  category: string;
  defaultPoints: number;
  emoji: string;
};

type Step = "menu" | "mode" | "confirm";

const MODE_OPTIONS = [
  {
    mode: "open" as const,
    label: "Open Bucket",
    description: "Anyone on the crew can claim it",
    icon: <Users className="w-6 h-6" />,
    tagline: "First come, first served",
  },
  {
    mode: "direct" as const,
    label: "Direct Assignment",
    description: "Tag a specific crew member",
    icon: <UserCheck className="w-6 h-6" />,
    tagline: "Tag, you're it",
  },
  {
    mode: "auction" as const,
    label: "Reverse Auction",
    description: "Crew bids down for the honor",
    icon: <Gavel className="w-6 h-6" />,
    tagline: "May the cheapest friend win",
  },
];

const URGENCY_OPTIONS = [
  { value: "whenever", label: "Whenever", color: "text-muted" },
  { value: "today", label: "Today", color: "text-warning" },
  { value: "asap", label: "ASAP", color: "text-danger" },
] as const;

export default function PlayCardPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { vibrate } = useHaptics();

  const [step, setStep] = useState<Step>("menu");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selected values
  const [selectedTask, setSelectedTask] = useState<Template | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"direct" | "open" | "auction">("open");
  const [urgency, setUrgency] = useState<"whenever" | "today" | "asap">("whenever");
  const [pointCost, setPointCost] = useState(25);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setActiveCategory(data.categories[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function selectTemplate(template: Template) {
    setSelectedTask(template);
    setPointCost(template.defaultPoints);
    setCustomTitle("");
    vibrate("light");
    setStep("mode");
  }

  async function submitCard() {
    setSubmitting(true);
    vibrate("medium");

    try {
      const title = selectedTask?.title || customTitle;
      const category = selectedTask?.category || "Wildcard";

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          category,
          pointCost,
          requestMode: mode,
          urgency,
          auctionSettings:
            mode === "auction"
              ? { minBid: 5, durationMinutes: 60, autoCloseAfterBids: null }
              : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      vibrate("success");
      addToast("success", "Card played! Your crew has been summoned.");
      router.push("/tasks");
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to play card"
      );
      setSubmitting(false);
    }
  }

  const filteredTemplates = templates.filter(
    (t) => t.category === activeCategory
  );

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {step !== "menu" && (
          <button
            onClick={() => setStep(step === "confirm" ? "mode" : "menu")}
            className="p-2 rounded-full hover:bg-royal-50 min-h-0 min-w-0"
          >
            <ArrowLeft className="w-5 h-5 text-midnight" />
          </button>
        )}
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-midnight">
            Play My Card
            <SuitIcon suit="spade" size="sm" className="ml-2 inline" />
          </h1>
          <p className="text-sm text-muted">
            {step === "menu" && "Pick what you need"}
            {step === "mode" && "Choose how to ask"}
            {step === "confirm" && "Review and play"}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1.5 mb-6">
        {(["menu", "mode", "confirm"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              (["menu", "mode", "confirm"] as Step[]).indexOf(step) >= i
                ? "bg-royal"
                : "bg-royal-100"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Menu */}
        {step === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-pill text-sm font-heading font-semibold whitespace-nowrap transition-colors min-h-[36px] min-w-0 ${
                    activeCategory === cat
                      ? "bg-royal text-white"
                      : "bg-royal-50 text-royal"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-2 gap-3 mt-3 card-stagger">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className="min-h-0 min-w-0"
                >
                  <Card className="flex flex-col items-center py-5 px-3 hover:shadow-card-hover transition-all active:scale-95 text-center h-full">
                    <span className="text-3xl mb-2">{template.emoji}</span>
                    <p className="font-heading font-bold text-sm text-midnight leading-tight">
                      {template.title}
                    </p>
                    <Badge variant="points" className="mt-2">
                      {template.defaultPoints} pts
                    </Badge>
                  </Card>
                </button>
              ))}
            </div>

            {/* Custom request */}
            <div className="mt-5">
              <p className="text-sm font-heading font-semibold text-muted mb-2">
                Or make a custom request:
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label=""
                    placeholder="What do you need?"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (customTitle.trim()) {
                      setSelectedTask(null);
                      setStep("mode");
                    }
                  }}
                  disabled={!customTitle.trim()}
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Mode */}
        {step === "mode" && (
          <motion.div
            key="mode"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <Card variant="champagne" padding="sm" className="text-center">
              <p className="text-sm text-muted">Selected task</p>
              <p className="font-heading font-bold text-midnight text-lg">
                {selectedTask?.emoji} {selectedTask?.title || customTitle}
              </p>
            </Card>

            <div>
              <p className="font-heading font-bold text-midnight mb-3">
                How should we deploy this?
              </p>
              <div className="space-y-3">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      setMode(opt.mode);
                      vibrate("light");
                    }}
                    className="w-full min-h-0 min-w-0"
                  >
                    <Card
                      className={`flex items-center gap-3 transition-all ${
                        mode === opt.mode
                          ? "ring-2 ring-royal bg-royal-50"
                          : "hover:shadow-card-hover"
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                          mode === opt.mode
                            ? "bg-royal text-white"
                            : "bg-royal-50 text-royal"
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-heading font-bold text-midnight text-sm">
                          {opt.label}
                        </p>
                        <p className="text-xs text-muted">{opt.tagline}</p>
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <p className="font-heading font-bold text-midnight mb-2">
                How urgent?
              </p>
              <div className="flex gap-2">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setUrgency(opt.value)}
                    className={`flex-1 py-2 rounded-button text-sm font-heading font-semibold transition-all min-h-[44px] min-w-0 ${
                      urgency === opt.value
                        ? "bg-royal text-white"
                        : "bg-royal-50 text-royal"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep("confirm")}
            >
              Review Card <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Preview Card */}
            <Card variant="elevated" padding="lg" className="relative overflow-hidden">
              <div className="absolute top-2 right-3 opacity-10">
                <SuitIcon suit="spade" size="xl" />
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-4xl">{selectedTask?.emoji || "🎲"}</span>
                  <h2 className="font-heading font-extrabold text-xl text-midnight mt-2">
                    {selectedTask?.title || customTitle}
                  </h2>
                </div>

                <div className="flex justify-center gap-3">
                  <Badge variant="points">{pointCost} pts</Badge>
                  <Badge variant={urgency === "asap" ? "danger" : urgency === "today" ? "warning" : "muted"}>
                    {urgency === "asap" ? "ASAP" : urgency === "today" ? "Today" : "Whenever"}
                  </Badge>
                  <Badge>
                    {mode === "auction" ? "Auction" : mode === "direct" ? "Direct" : "Open"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Optional note */}
            <Input
              label="Add a note (optional)"
              placeholder="Extra details for your crew..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Point cost adjustment */}
            <div>
              <p className="font-heading font-bold text-midnight text-sm mb-2">
                Point cost
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPointCost(Math.max(5, pointCost - 5))}
                  className="w-11 h-11 rounded-full bg-royal-50 text-royal font-bold text-xl min-h-0 min-w-0"
                >
                  -
                </button>
                <span className="font-mono font-bold text-2xl text-royal tabular-nums flex-1 text-center">
                  {pointCost}
                </span>
                <button
                  onClick={() => setPointCost(Math.min(500, pointCost + 5))}
                  className="w-11 h-11 rounded-full bg-royal-50 text-royal font-bold text-xl min-h-0 min-w-0"
                >
                  +
                </button>
              </div>
            </div>

            {/* Play button */}
            <motion.div
              whileTap={{ scale: 0.95 }}
            >
              <Button
                className="w-full bg-gradient-to-r from-royal to-blush hover:from-royal-dark hover:to-blush-dark"
                size="lg"
                loading={submitting}
                onClick={submitCard}
              >
                <Zap className="w-5 h-5" fill="white" />
                Play My Cancer Card
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
