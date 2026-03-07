"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Card padding="lg" className="text-center">
        <p className="text-4xl mb-3">♦</p>
        <h1 className="font-heading font-extrabold text-xl text-midnight mb-2">
          Dashboard error
        </h1>
        <p className="text-sm text-muted mb-6">
          Something went wrong loading admin data.
        </p>
        <Button onClick={reset} size="sm">
          Try Again
        </Button>
      </Card>
    </div>
  );
}
