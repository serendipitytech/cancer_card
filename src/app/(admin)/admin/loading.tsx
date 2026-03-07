import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div>
      <div className="h-8 w-40 rounded-md animate-shimmer mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-card p-4 shadow-card space-y-2">
            <Skeleton className="w-20" />
            <Skeleton className="w-16 h-8" variant="rectangular" />
          </div>
        ))}
      </div>
    </div>
  );
}
