import { CardSkeleton } from "@/components/ui/skeleton";

export default function MainLoading() {
  return (
    <div className="px-4 pt-6 max-w-lg mx-auto space-y-4">
      <div className="h-8 w-40 rounded-md animate-shimmer" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
