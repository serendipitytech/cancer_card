"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Main app error:", error);
  }, [error]);

  return (
    <div className="px-4 pt-12 max-w-lg mx-auto">
      <Card padding="lg" className="text-center">
        <p className="text-4xl mb-3">♠</p>
        <h1 className="font-heading font-extrabold text-xl text-midnight mb-2">
          Something went sideways
        </h1>
        <p className="text-sm text-muted mb-6">
          Even cancer can&apos;t break this app — but that bug just tried.
        </p>
        <Button onClick={reset} size="sm">
          Try Again
        </Button>
      </Card>
    </div>
  );
}
