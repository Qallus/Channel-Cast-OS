/**
 * Per-user throttle for agent actions.
 *
 * These calls cost money per request, so a stuck button or an impatient click
 * must not be able to hammer the provider. In-memory is deliberate: it resets
 * on deploy and isn't shared between instances, which is fine for a guard rail
 * whose only job is to stop runaway repeats from one person.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

export function allowAgentAction(userId: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0];
    hits.set(userId, recent);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)) };
  }

  recent.push(now);
  hits.set(userId, recent);

  // Drop idle callers so the map can't grow without bound.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return { ok: true };
}
