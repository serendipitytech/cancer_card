import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { TabBar } from "@/components/ui/tab-bar";
import { NotificationBell } from "@/components/notifications/notification-bell";

// Per-user, DB-backed, auth-gated: never statically prerender (there is no DB
// at build time, and every render is user-specific).
export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Auth gate for the app shell. The middleware used to do this; with Logto we
  // gate in the server layout and redirect into the hosted sign-in flow.
  // Sensitive data is additionally enforced per-endpoint in the API routes.
  if (!session) {
    redirect("/sign-in");
  }

  const crew = await getUserActiveCrew(session.user.id);
  const role = crew?.role ?? "crew_member";

  return (
    <div className="min-h-dvh bg-cloud">
      <header className="sticky top-0 z-40 bg-cloud/80 backdrop-blur-md safe-top">
        <div className="flex items-center justify-end px-4 py-2">
          <NotificationBell />
        </div>
      </header>
      <main className="pb-24">{children}</main>
      <TabBar role={role} />
    </div>
  );
}
