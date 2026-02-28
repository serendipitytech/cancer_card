import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { TabBar } from "@/components/ui/tab-bar";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const crew = session?.user?.id
    ? await getUserActiveCrew(session.user.id)
    : null;
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
