import { SuitIcon } from "@/components/cards/suit-icon";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-royal-50 via-cloud to-blush-50 flex flex-col items-center justify-center px-5 py-10 safe-top safe-bottom">
      {/* Decorative corner suits */}
      <div className="fixed top-6 left-6 opacity-10">
        <SuitIcon suit="spade" size="xl" />
      </div>
      <div className="fixed top-6 right-6 opacity-10">
        <SuitIcon suit="heart" size="xl" />
      </div>
      <div className="fixed bottom-6 left-6 opacity-10">
        <SuitIcon suit="diamond" size="xl" />
      </div>
      <div className="fixed bottom-6 right-6 opacity-10">
        <SuitIcon suit="club" size="xl" />
      </div>

      <div className="w-full">{children}</div>
    </div>
  );
}
