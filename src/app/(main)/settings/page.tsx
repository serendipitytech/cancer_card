import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { DeleteAccountSection } from "@/components/settings/delete-account";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-midnight">
          Settings
        </h1>
        {session?.user?.email && (
          <p className="text-muted text-sm mt-1">
            Signed in as {session.user.email}
          </p>
        )}
      </div>

      <Card variant="default" padding="lg" className="space-y-2">
        <h2 className="font-heading font-bold text-base text-midnight">
          Sign-in & password
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Sign in with a secure email link any time, no password needed. If
          you would rather use a password, sign out and choose &quot;forgot
          password&quot; on the sign-in screen to set one for the first time.
          After that, either option works whenever you sign in.
        </p>
      </Card>

      <DeleteAccountSection />
    </div>
  );
}
