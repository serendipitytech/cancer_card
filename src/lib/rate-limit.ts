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

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(namespace: string): Map<string, RateLimitEntry> {
  const existing = stores.get(namespace);
  if (existing) return existing;

  const store = new Map<string, RateLimitEntry>();
  stores.set(namespace, store);
  return store;
}

export function checkRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig,
  increment = 1
): RateLimitResult {
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
