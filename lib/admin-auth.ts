import { createHash, createHmac, timingSafeEqual } from "crypto";

// Single-user admin login. The password lives ONLY in the ADMIN_PASSWORD
// environment variable — never in code or the repo. If it isn't set (or is
// too short to be a real password), login is disabled entirely rather than
// falling back to anything guessable.

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const MIN_PASSWORD_LENGTH = 10;

function configuredPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= MIN_PASSWORD_LENGTH ? p : null;
}

export function adminEnabled(): boolean {
  return configuredPassword() !== null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Hashing both sides first gives timingSafeEqual equal-length inputs, so
// neither the comparison time nor an early length mismatch leaks anything
// about the real password.
export function checkPassword(candidate: string): boolean {
  const real = configuredPassword();
  if (!real) return false;
  return timingSafeEqual(sha256(candidate), sha256(real));
}

// The signing key is derived from the password, so changing the password
// instantly invalidates every existing session.
function signingKey(): Buffer {
  return sha256(`admin-session:${configuredPassword() ?? ""}`);
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !adminEnabled()) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(sign(expires));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- login throttling -------------------------------------------------
// Per-source limit plus a global cap, so guessing the password online is
// impractical. The source key is the LAST x-forwarded-for entry (the one
// our own proxy appended), since earlier entries are client-supplied and
// trivially spoofed to dodge a per-IP limit.
const WINDOW_MS = 15 * 60_000;
const MAX_PER_SOURCE = 8;
const MAX_GLOBAL = 40;
const attempts = new Map<string, number[]>();
let globalAttempts: number[] = [];

export function sourceKey(forwardedFor: string | null): string {
  const parts = (forwardedFor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "unknown";
}

export function loginRateLimited(source: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(source) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(source, recent);
  globalAttempts = globalAttempts.filter((t) => now - t < WINDOW_MS);
  globalAttempts.push(now);
  if (attempts.size > 2000) {
    for (const [key, times] of attempts) {
      if (times.every((t) => now - t >= WINDOW_MS)) attempts.delete(key);
    }
  }
  return recent.length > MAX_PER_SOURCE || globalAttempts.length > MAX_GLOBAL;
}

// Requests that change state must come from this site itself.
export function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true; // non-browser clients; the cookie is the real gate
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
