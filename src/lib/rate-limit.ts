type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export const RATE_LIMITS = {
  read: { windowMs: 60 * 1000, maxRequests: 120 },
  write: { windowMs: 60 * 60 * 1000, maxRequests: 30 },
  sensitive: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  bid: { windowMs: 60 * 60 * 1000, maxRequests: 60 },
  stream: { windowMs: 60 * 1000, maxRequests: 5 },
} as const;

const stores = new Map<string, Map<string, RateLimitEntry>>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function getStore(namespace: string): Map<string, RateLimitEntry> {
  const existing = stores.get(namespace);
  if (existing) return existing;

  const store = new Map<string, RateLimitEntry>();
  stores.set(namespace, store);
  return store;
}

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [namespace, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
    if (store.size === 0) {
      stores.delete(namespace);
    }
  }
}

export function checkRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig,
  increment = 1
): RateLimitResult {
  maybeCleanup();

  const store = getStore(namespace);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: increment, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - increment,
      resetAt,
    };
  }

  if (entry.count + increment > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  const updated = { ...entry, count: entry.count + increment };
  store.set(key, updated);

  return {
    allowed: true,
    remaining: config.maxRequests - updated.count,
    resetAt: updated.resetAt,
  };
}
