"use client";

const sha = process.env.NEXT_PUBLIC_GIT_SHA ?? "dev";

export function VersionFooter() {
  return (
    <div className="fixed bottom-0 right-0 z-40 pointer-events-none pb-safe-bottom pr-1">
      <span className="text-[10px] font-mono text-neutral-400/60 select-none">
        {sha}
      </span>
    </div>
  );
}
