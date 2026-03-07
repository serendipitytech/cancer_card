"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-cloud flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">♠</p>
        <h1 className="font-heading font-extrabold text-2xl text-midnight mb-2">
          Something went sideways
        </h1>
        <p className="text-sm text-muted mb-6">
          Even cancer can&apos;t break this app — but that bug just tried.
          We&apos;re on it.
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
