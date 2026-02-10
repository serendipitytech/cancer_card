"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuitIcon } from "@/components/cards/suit-icon";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Give it another shot.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went sideways. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="animate-card-deal">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-royal to-blush mb-4">
          <SuitIcon suit="spade" size="lg" className="text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-3xl text-midnight">
          The Cancer Card
        </h1>
        <p className="text-muted mt-1 text-sm">
          Because if you can&apos;t laugh at cancer, cancer wins.
        </p>
      </div>

      {/* Form */}
      <div className="bg-surface rounded-card shadow-raised p-6">
        <h2 className="font-heading font-bold text-xl text-midnight mb-5">
          Welcome back
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            error={error || undefined}
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            Sign In
          </Button>
        </form>
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm text-muted mt-6">
        New here?{" "}
        <Link
          href="/signup"
          className="text-royal font-semibold hover:underline min-h-0 min-w-0"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
