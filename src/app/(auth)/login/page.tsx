import Link from "next/link";
import { SuitIcon } from "@/components/cards/suit-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Login landing page.
 *
 * Sign-in itself now happens on Logto's hosted sign-in experience (this app
 * redirects out to /sign-in, which hands off to auth.serendipitylabs.cloud).
 * Per Troy's decision (2026-08-24), returning users get a clear explanation
 * of the change before we send them there: what changed, why, and how to
 * proceed. No silent redirect.
 */
export default function LoginPage() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-1 mb-3">
          <SuitIcon suit="spade" size="lg" className="text-royal" />
          <SuitIcon suit="heart" size="lg" className="text-blush" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Welcome back
        </h1>
      </div>

      <Card variant="accent" padding="lg" className="space-y-3">
        <h2 className="font-heading font-bold text-base text-midnight">
          We upgraded how sign-in works
        </h2>
        <p className="text-sm text-ink leading-relaxed">
          Your old password will not work anymore. We moved sign-in to a
          dedicated identity service so we are never storing your password
          ourselves, and so you can reset your own access any time instead of
          waiting on us.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          Enter the email you used before. We will send you a secure sign-in
          link, no password needed. Once you are in, you can also set a
          password for next time if you would rather use one.
        </p>
      </Card>

      <a href="/sign-in">
        <Button variant="primary" size="lg" className="w-full">
          Continue to sign in
        </Button>
      </a>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-royal font-semibold">
          Create an account
        </Link>
      </p>

      <p className="text-center text-xs text-muted">
        Questions about the change? Reach out and we will help you get back
        in.
      </p>
    </div>
  );
}
