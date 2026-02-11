import Link from "next/link";
import { SuitIcon } from "@/components/cards/suit-icon";
import { Button } from "@/components/ui/button";

function SectionHeader({
  suit,
  step,
  title,
}: {
  suit: "spade" | "heart" | "diamond" | "club";
  step: number;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-royal to-blush shrink-0">
        <SuitIcon suit={suit} size="md" className="text-white" />
      </div>
      <h2 className="font-heading font-bold text-xl text-midnight">
        Step {step}: {title}
      </h2>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-royal-50 border border-royal-200 rounded-xl p-4 mt-4">
      <SuitIcon suit="diamond" size="sm" className="text-royal shrink-0 mt-0.5" />
      <p className="text-sm text-ink leading-relaxed">{children}</p>
    </div>
  );
}

function OrderedList({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-ink leading-relaxed">
          <span className="font-mono font-bold text-royal shrink-0 mt-px">
            {i + 1}.
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function QuickStartPage() {
  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Sticky navigation */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-royal-50/95 via-cloud/95 to-transparent backdrop-blur-sm pb-4 pt-2 -mx-5 px-5">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="text-sm text-royal font-semibold hover:underline min-h-[44px] flex items-center"
            aria-label="Return to sign in page"
          >
            &larr; Sign In
          </Link>
          <Link href="/signup">
            <Button size="sm">Create Account</Button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-royal to-blush mb-4">
          <SuitIcon suit="spade" size="lg" className="text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-3xl text-midnight">
          Quick Start Guide
        </h1>
        <p className="text-muted mt-2 text-sm max-w-md mx-auto">
          Everything you need to set up your account and get your support crew
          ready to help.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {/* Step 1 */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <SectionHeader suit="spade" step={1} title="Create Your Account" />
          <OrderedList
            items={[
              "Open the app in your phone's browser",
              <>Tap <strong>Create an account</strong></>,
              <>
                Fill in: <strong>Your Name</strong> (whatever you want your crew
                to call you), <strong>Email</strong>, and{" "}
                <strong>Password</strong> (8+ characters)
              </>,
              <>Tap <strong>Create Account</strong></>,
            ]}
          />
          <Tip>
            After signing up, add the app to your home screen for the best
            experience. On iPhone, tap the Share button then &ldquo;Add to Home
            Screen.&rdquo; On Android, tap the menu then &ldquo;Install
            app.&rdquo;
          </Tip>
        </section>

        {/* Step 2 */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <SectionHeader suit="heart" step={2} title="Create Your Crew" />
          <p className="text-sm text-muted mb-3">
            After signing up, you&apos;ll land on the Welcome screen.
          </p>
          <OrderedList
            items={[
              <>Tap <strong>&ldquo;I&apos;m the Patient&rdquo;</strong></>,
              <>
                Give your crew a name &mdash; make it fun! Examples:{" "}
                <em>&ldquo;Team Sarah&rdquo;</em>,{" "}
                <em>&ldquo;The Avengers&rdquo;</em>,{" "}
                <em>&ldquo;Sarah&apos;s Cancer Crew&rdquo;</em>
              </>,
              <>Tap <strong>Create Crew</strong></>,
              <>
                You&apos;ll see your <strong>invite code</strong> &mdash; an
                8-letter code like{" "}
                <code className="font-mono bg-royal-50 text-royal px-1.5 py-0.5 rounded text-xs">
                  A7BX3KMP
                </code>
              </>,
              <>
                Tap the copy button and{" "}
                <strong>send this code to your people</strong>
              </>,
            ]}
          />
          <Tip>
            This code is how your friends and family join your crew. Send it via
            text, email, group chat &mdash; wherever your people are.
          </Tip>
        </section>

        {/* Step 3 */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <SectionHeader suit="diamond" step={3} title="Explore Your Dashboard" />
          <p className="text-sm text-muted mb-3">
            Once your crew is created, you&apos;ll see your dashboard with:
          </p>
          <ul className="space-y-2 ml-1">
            {[
              {
                label: "Point Balance",
                desc: "You start with 500 points. Spend points to request help, earn them back through self-care.",
              },
              {
                label: "Quick Actions",
                desc: "Shortcuts to Play Card, Self-Care, Tasks, and Crew.",
              },
              {
                label: "Invite Code",
                desc: "Tap to copy and share anytime.",
              },
              {
                label: "Recent Activity",
                desc: "See what's happening in your crew.",
              },
            ].map(({ label, desc }) => (
              <li
                key={label}
                className="flex gap-3 text-sm text-ink leading-relaxed"
              >
                <SuitIcon suit="club" size="sm" className="shrink-0 mt-0.5" />
                <span>
                  <strong>{label}</strong> &mdash; {desc}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Step 4 */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <SectionHeader suit="club" step={4} title="Play Your Cancer Card" />
          <p className="text-sm text-muted mb-3">
            This is the core of the app &mdash; asking for help without the
            awkward &ldquo;can you...&rdquo; conversation.
          </p>
          <OrderedList
            items={[
              <>
                Tap the big purple <strong>Play Card</strong> button (center of
                the bottom bar)
              </>,
              <>
                <strong>Pick a task</strong> from the menu: Food &amp; Drinks,
                Transportation, Household, Errands, Company &amp; Comfort, Pet
                Care, Kid Care, or Wildcard
              </>,
              <>
                <strong>Choose how to assign it:</strong>
                <ul className="mt-1 space-y-1 ml-4">
                  <li>
                    <strong>Open</strong> &mdash; Anyone on your crew can claim
                    it
                  </li>
                  <li>
                    <strong>Direct</strong> &mdash; Assign to a specific crew
                    member
                  </li>
                  <li>
                    <strong>Auction</strong> &mdash; Your crew bids (lowest
                    point cost wins!)
                  </li>
                </ul>
              </>,
              <>
                <strong>Set urgency:</strong> Whenever, Today, or ASAP
              </>,
              <>
                Tap <strong>Play My Cancer Card</strong> to confirm
              </>,
            ]}
          />
          <Tip>
            Each task has a point cost. Don&apos;t worry about running low
            &mdash; points can go negative. The point system is there to make it
            fun, not to limit you.{" "}
            <strong>Never hesitate to ask for help.</strong>
          </Tip>
        </section>

        {/* Step 5 */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <SectionHeader suit="heart" step={5} title="Log Your Self-Care" />
          <p className="text-sm text-muted mb-3">
            Earn points back by taking care of yourself! Tap the{" "}
            <strong>heart icon</strong> on the bottom bar.
          </p>

          {/* Points table */}
          <div className="overflow-hidden rounded-xl border border-royal-200 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-royal-50">
                  <th className="text-left px-4 py-2 font-heading font-semibold text-midnight">
                    Activity
                  </th>
                  <th className="text-right px-4 py-2 font-mono font-bold text-royal">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal-100">
                {[
                  { activity: "Completed chemo session", points: "+100" },
                  { activity: "Attended doctor appointment", points: "+50" },
                  { activity: "Did something fun / laughed", points: "+30" },
                  { activity: "Took all medications today", points: "+25" },
                  { activity: "Good sleep", points: "+20" },
                  { activity: "Walk / light exercise", points: "+15" },
                  { activity: "Ate a full meal", points: "+15" },
                  { activity: "Drank enough water", points: "+10" },
                ].map(({ activity, points }) => (
                  <tr key={activity} className="bg-surface">
                    <td className="px-4 py-2.5 text-ink">{activity}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-success">
                      {points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blush-50 border border-blush-200 rounded-xl p-4">
            <p className="text-sm text-ink leading-relaxed">
              <strong>Streaks matter!</strong> Log milestones multiple days in a
              row for bonus points:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              <li>
                <SuitIcon suit="heart" size="sm" className="mr-1" />
                3-day streak:{" "}
                <span className="font-mono font-bold text-success">
                  +50 bonus
                </span>
              </li>
              <li>
                <SuitIcon suit="heart" size="sm" className="mr-1" />
                7-day streak:{" "}
                <span className="font-mono font-bold text-success">
                  +150 bonus
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Step 6 */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <SectionHeader suit="spade" step={6} title="Share With Your Crew" />
          <p className="text-sm text-muted mb-3">
            Your crew members need to:
          </p>
          <OrderedList
            items={[
              "Open the app link you send them",
              <>
                Tap <strong>Create an account</strong> (name, email, password)
              </>,
              <>
                On the Welcome screen, tap{" "}
                <strong>&ldquo;I&apos;m the Support&rdquo;</strong>
              </>,
              <>
                Enter the <strong>invite code</strong> you shared with them
              </>,
              <>
                They&apos;re in! They&apos;ll see available tasks and can start
                claiming them
              </>,
            ]}
          />
        </section>

        {/* Tips */}
        <section className="bg-surface rounded-card shadow-raised p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-royal to-blush shrink-0">
              <SuitIcon suit="diamond" size="md" className="text-white" />
            </div>
            <h2 className="font-heading font-bold text-xl text-midnight">
              Tips
            </h2>
          </div>
          <ul className="space-y-3">
            {[
              {
                suit: "spade" as const,
                text: "Don't overthink it. The whole point is to make asking for help easy and even fun.",
              },
              {
                suit: "heart" as const,
                text: "Use the Auction mode for non-urgent stuff \u2014 your crew will compete to help you!",
              },
              {
                suit: "diamond" as const,
                text: "Log self-care daily \u2014 it's good for your points AND good for your soul.",
              },
              {
                suit: "club" as const,
                text: "Check the Leaderboard (trophy icon) \u2014 a little friendly competition keeps your crew engaged.",
              },
            ].map(({ suit, text }) => (
              <li
                key={text}
                className="flex gap-3 text-sm text-ink leading-relaxed"
              >
                <SuitIcon suit={suit} size="sm" className="shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Bottom CTA */}
        <div className="text-center py-6">
          <p className="text-muted text-sm mb-4">
            Ready to play your cancer card?
          </p>
          <Link href="/signup">
            <Button size="lg" className="w-full max-w-xs">
              Create Your Account
            </Button>
          </Link>
          <p className="text-xs text-muted mt-3">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-royal font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
