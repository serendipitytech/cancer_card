"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuitIcon } from "@/components/cards/suit-icon";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error });
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ form: "Account created but couldn't sign in. Try logging in." });
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: "Something went sideways. Please try again." });
      setLoading(false);
    }
  }

  return (
    <div className="animate-card-deal">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-royal to-blush mb-4">
          <SuitIcon suit="heart" size="lg" className="text-white" />
        </div>
        <h1 className="font-heading font-extrabold text-3xl text-midnight">
          Join the Game
        </h1>
        <p className="text-muted mt-1 text-sm">
          Create your account to play your cancer card
        </p>
      </div>

      {/* Form */}
      <div className="bg-surface rounded-card shadow-raised p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            type="text"
            placeholder="How should we call you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
          />

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
            placeholder="8+ characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />

          {errors.form && (
            <p className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
              {errors.form}
            </p>
          )}

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            Create Account
          </Button>
        </form>
      </div>

      {/* Login link */}
      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-royal font-semibold hover:underline min-h-0 min-w-0"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
