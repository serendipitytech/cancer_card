import { describe, it, expect, afterEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// The limiter is a pure in-memory counter. Each test uses a unique key so the
// module-level store does not leak counts between tests.
let n = 0;
function freshKey(): string {
  n += 1;
  return `key-${n}-${Math.random()}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("rate-limit", () => {
  it("allows up to maxRequests then blocks", () => {
    const key = freshKey();
    const cfg = { windowMs: 60_000, maxRequests: 3 };

    expect(checkRateLimit("test", key, cfg).allowed).toBe(true);
    expect(checkRateLimit("test", key, cfg).allowed).toBe(true);
    expect(checkRateLimit("test", key, cfg).allowed).toBe(true);
    expect(checkRateLimit("test", key, cfg).allowed).toBe(false);
  });

  it("reports decreasing remaining and a reset timestamp", () => {
    const key = freshKey();
    const cfg = { windowMs: 60_000, maxRequests: 5 };

    const first = checkRateLimit("test", key, cfg);
    const second = checkRateLimit("test", key, cfg);

    expect(first.remaining).toBe(4);
    expect(second.remaining).toBe(3);
    expect(second.resetAt).toBeGreaterThan(Date.now());
  });

  it("keeps separate keys independent", () => {
    const cfg = { windowMs: 60_000, maxRequests: 1 };
    const a = freshKey();
    const b = freshKey();

    expect(checkRateLimit("test", a, cfg).allowed).toBe(true);
    expect(checkRateLimit("test", a, cfg).allowed).toBe(false);
    // b is untouched.
    expect(checkRateLimit("test", b, cfg).allowed).toBe(true);
  });

  it("keeps separate namespaces independent", () => {
    const cfg = { windowMs: 60_000, maxRequests: 1 };
    const key = freshKey();

    expect(checkRateLimit("ns-a", key, cfg).allowed).toBe(true);
    expect(checkRateLimit("ns-a", key, cfg).allowed).toBe(false);
    // Same key, different namespace, independent budget.
    expect(checkRateLimit("ns-b", key, cfg).allowed).toBe(true);
  });

  it("resets the budget after the window elapses", () => {
    vi.useFakeTimers();
    const key = freshKey();
    const cfg = { windowMs: 1_000, maxRequests: 1 };

    expect(checkRateLimit("test", key, cfg).allowed).toBe(true);
    expect(checkRateLimit("test", key, cfg).allowed).toBe(false);

    vi.advanceTimersByTime(1_500);

    expect(checkRateLimit("test", key, cfg).allowed).toBe(true);
  });

  it("honors a custom increment weight", () => {
    const key = freshKey();
    const cfg = { windowMs: 60_000, maxRequests: 10 };

    const result = checkRateLimit("test", key, cfg, 4);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(6);
  });
});
