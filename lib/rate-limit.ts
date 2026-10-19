// Tiny in-memory sliding-window limiter, one bucket per key (an IP here).
// Only protects a single Node process, which is the normal topology for
// this app. Each caller makes its own limiter so routes do not share a budget.
export function createRateLimiter(windowMs: number, maxRequests: number) {
  const hits = new Map<string, number[]>();
  return function limited(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    // Drop idle keys now and then so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return recent.length > maxRequests;
  };
}
