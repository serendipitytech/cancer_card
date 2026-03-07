"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth error:", error);
  }, [error]);

  return (
    <Card padding="lg" className="max-w-sm mx-auto text-center">
      <p className="text-4xl mb-3">♥</p>
      <h1 className="font-heading font-extrabold text-xl text-midnight mb-2">
        Login hit a snag
      </h1>
      <p className="text-sm text-muted mb-6">
        Something unexpected happened. Give it another shot.
      </p>
      <Button onClick={reset} size="sm">
        Try Again
      </Button>
    </Card>
  );
}
