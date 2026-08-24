import Link from "next/link";
import { SuitIcon } from "@/components/cards/suit-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Signup landing page. Account creation itself happens on Logto's hosted
 * sign-in experience (same /sign-in redirect as login; Logto's flow offers
 * both sign-in and registration).
 */
export default function SignupPage() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-1 mb-3">
          <SuitIcon suit="diamond" size="lg" className="text-royal" />
          <SuitIcon suit="club" size="lg" className="text-blush" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Create your account
        </h1>
      </div>

      <Card variant="accent" padding="lg" className="space-y-3">
        <p className="text-sm text-ink leading-relaxed">
          We will ask for your email, then send you a secure sign-in link so
          you can get started right away. You can add a password afterward if
          you would rather use one next time.
        </p>
      </Card>

      <a href="/sign-in">
        <Button variant="primary" size="lg" className="w-full">
          Continue
        </Button>
      </a>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-royal font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}
