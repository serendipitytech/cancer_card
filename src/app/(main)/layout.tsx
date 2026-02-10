import { TabBar } from "@/components/ui/tab-bar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cloud">
      <main className="pb-24 safe-top">{children}</main>
      <TabBar />
    </div>
  );
}
