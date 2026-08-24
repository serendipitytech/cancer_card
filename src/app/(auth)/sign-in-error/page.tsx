import { SuitIcon } from "@/components/cards/suit-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Sign-in error landing page.
 *
 * The Logto callback route lands here when it can't finish setting up the
 * account after a sign-in (see `/callback`). We already sign the Logto
 * session out before redirecting here, so "sign in again" is always a safe,
 * clean retry, not a stuck loop.
 */
export default function SignInErrorPage() {
  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-1 mb-3">
          <SuitIcon suit="diamond" size="lg" className="text-royal" />
          <SuitIcon suit="club" size="lg" className="text-blush" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          We hit a snag signing you in
        </h1>
      </div>

      <Card variant="accent" padding="lg" className="space-y-3">
        <p className="text-sm text-ink leading-relaxed">
          Something went wrong finishing your sign-in. Nothing was saved and
          you have not been signed in, so it is safe to try again.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          If this keeps happening, reach out and we will help you get back
          in.
        </p>
      </Card>

      <a href="/sign-in">
        <Button variant="primary" size="lg" className="w-full">
          Try signing in again
        </Button>
      </a>
    </div>
  );
}
