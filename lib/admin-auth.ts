import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";

// Single-user admin login.
//
// Two ways to set the password:
//  1. ADMIN_PASSWORD environment variable (if set, it wins), or
//  2. BUILT_IN_PASSWORD_HASH below — a salted scrypt hash, NOT the
//     password itself. The repo is public, so the plaintext must never be
//     committed; a hash lets the site check a typed password without the
//     password being readable from the code. To change it, generate a new
//     hash (see the comment on the constant) and replace the string.

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;

// Format: scrypt$<salt hex>$<hash hex>. Generate with:
//   node -e "const c=require('crypto');const s=c.randomBytes(16);console.log('scrypt$'+s.toString('hex')+'$'+c.scryptSync(process.argv[1],s,32).toString('hex'))" "your password"
const BUILT_IN_PASSWORD_HASH =
  "scrypt$a969b262698e9d0bd7b0ad1c4c917a6f$c3b9d58de700666582d91ecdddf5becfe1add69ad846a14c7452596c46dbb4df";

function envPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= MIN_PASSWORD_LENGTH ? p : null;
}

export function adminEnabled(): boolean {
  return envPassword() !== null || BUILT_IN_PASSWORD_HASH.startsWith("scrypt$");
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function verifyBuiltIn(candidate: string): boolean {
  const [scheme, saltHex, hashHex] = BUILT_IN_PASSWORD_HASH.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(candidate, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

// Constant-time comparison either way, so neither timing nor an early
// length mismatch leaks anything about the real password.
export function checkPassword(candidate: string): boolean {
  if (candidate.length === 0 || candidate.length > MAX_PASSWORD_LENGTH) return false;
  const env = envPassword();
  if (env) return timingSafeEqual(sha256(candidate), sha256(env));
  return verifyBuiltIn(candidate);
}

// --- session cookie ---------------------------------------------------
// The signing key is a random secret kept on the server (data/, which is
// gitignored) — never derived from anything in the repo. Because the repo
// is public, deriving it from the password hash would let anyone forge a
// valid login cookie without knowing the password. If the file is lost,
// a new secret is generated and everyone is simply logged out.
let sessionSecret: Buffer | null = null;

function signingKey(): Buffer {
  if (sessionSecret) return sessionSecret;
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "session-secret");
  try {
    const stored = Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
    if (stored.length !== 32) throw new Error("bad secret");
    sessionSecret = stored;
  } catch {
    sessionSecret = randomBytes(32);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, sessionSecret.toString("hex"), { mode: 0o600 });
    } catch {
      // Read-only filesystem: keep the secret in memory only. Logins then
      // last until the next restart, which is fine.
    }
  }
  return sessionSecret;
}

// Mixed into every signature so changing the password (or its hash)
// instantly invalidates all existing sessions.
function passwordFingerprint(): string {
  return sha256(`pw:${envPassword() ?? BUILT_IN_PASSWORD_HASH}`).toString("hex").slice(0, 16);
}

function sign(expires: string): string {
  return createHmac("sha256", signingKey()).update(`${expires}|${passwordFingerprint()}`).digest("hex");
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
