"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      // Clear the Logto session server-side and land on the app root.
      window.location.href = "/sign-out";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-card shadow-raised p-6 space-y-4">
      <div>
        <h2 className="font-heading font-bold text-lg text-midnight">
          Close your account
        </h2>
        <p className="text-sm text-muted mt-1">
          Your personal information (name, email, photo) will be removed. Your
          crew and its history stay intact so the people you supported are not
          left stranded, and your crew will be told you have closed your account.
          This cannot be undone.
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {!confirming ? (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Close my account
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink">
            Are you sure? This removes your personal information for good.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Keep my account
            </Button>
            <Button variant="danger" loading={loading} onClick={handleDelete}>
              Yes, close it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
