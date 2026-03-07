import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (
    ADMIN_EMAILS.length === 0 ||
    !ADMIN_EMAILS.includes(session.user.email?.toLowerCase() ?? "")
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-dvh bg-cloud">
      <div className="md:flex">
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <AdminNav />
        </aside>
        <div className="md:pl-64 flex-1">
          <div className="md:hidden">
            <AdminNav mobile />
          </div>
          <main className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
