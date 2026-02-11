import { auth } from "@/lib/auth";
import { getUserActiveCrew } from "@/lib/session";
import { TabBar } from "@/components/ui/tab-bar";

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
      <main className="pb-24 safe-top">{children}</main>
      <TabBar role={role} />
    </div>
  );
}
