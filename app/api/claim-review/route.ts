import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { getReviewAreaBySlug } from "@/lib/review-areas";
import { engineKeyFor, getEngineByKey } from "@/lib/engines";

// Server-side ledger of every review that's actually been copied (i.e. a
// visitor intends to post it). This is what makes duplicates impossible,
// not the size of the phrase pool — see lib/review-generator.ts for why
// random generation alone can't guarantee that.
//
// The primary dedup rule is phrase-overlap, not exact-text match: a
// candidate is rejected if it shares more than 4 of its 7 content phrases
// (service, opening, timeliness, workmanship, pricing, closing, one-liner)
// with anything already used — otherwise two reviews could differ only in
// punctuation/capitalization (cosmetic, see joinVariants/
// capitalizationStyles) while reading as the same review to anyone
// comparing them. On top of that, exact rendered text is also checked
// directly — this matters most for the short one-liner format, where only
// 2 of the 7 content indices (service, one-liner) actually render, so two
// different-looking contentKeys could still produce byte-identical text.
//
// A candidate only counts as "used" once it's actually claimed here — a
// visitor hitting Regenerate without copying never touches this ledger.
//
// Caveat: this reads/writes a JSON file on local disk. It survives while
// the server process keeps running, but if a redeploy replaces the whole
// app directory with a fresh checkout, this file resets unless the host
// preserves it outside the git-tracked tree. Confirm that with Hostinger
// before relying on it long-term; if it doesn't persist, this needs to
// move to an external store (e.g. a free-tier Redis/KV service).

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "used-reviews.json");
const MAX_MATCHING_PHRASES = 4;

// A distinctive phrase (an opening, a backstory, a closer) may not repeat
// within the last few reviews of the same business. The engine lists which
// phrase slots count (RECENCY_SLOTS); the original engine lists none.
const RECENCY_WINDOW = 8;

interface UsedRecord {
  id: number;
  area: string;
  text: string;
  contentKey: number[];
  // Which business's phrase pools the contentKey indexes into. Records
  // from before this field existed are plumbing.
  engine?: string;
  usedAt: string;
}

// Hard limits. This endpoint is public and unauthenticated, so without
// them anything that can send a POST (a bot, a scanner) can append
// unlimited junk entries — every request then re-reads, parses and
// rewrites a bigger file, and CPU/memory/disk climb until the process
// is starved. Real use is a handful of entries a day, so these are
// generous for legitimate traffic and tiny for abuse.
const MAX_LEDGER_ENTRIES = 5000;
const MAX_TEXT_LENGTH = 1500;
const MAX_BODY_BYTES = 4096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

// The ledger lives in memory after the first read, so a request no longer
// re-reads and re-parses the whole file; writes go to a temp file and are
// renamed into place so a crash mid-write can't leave truncated JSON
// (which the old read path silently treated as an empty ledger).
let cache: UsedRecord[] | null = null;

async function readUsed(): Promise<UsedRecord[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    cache = JSON.parse(raw) as UsedRecord[];
  } catch {
    cache = [];
  }
  return cache;
}

async function writeUsed(records: UsedRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records));
  await fs.rename(tmp, DATA_FILE);
  cache = records;
}

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function validContentKey(key: unknown, dims: number[]): key is number[] {
  return (
    Array.isArray(key) &&
    key.length === dims.length &&
    // -1 marks a phrase slot the review does not show.
    key.every((n, i) => Number.isInteger(n) && n >= -1 && n < dims[i])
  );
}

function matchingPhraseCount(a: number[], b: number[]): number {
  let count = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] >= 0 && a[i] === b[i]) count++;
  }
  return count;
}

// Serializes read-check-write within this process so two near-simultaneous
// copy clicks can't both pass the "not too similar" check before either
// write lands. Only protects a single Node process, which is the normal
// topology for this kind of small app.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "too many requests" }, { status: 429 });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }
  const rawBody = await req.text().catch(() => "");
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }
  let body: {
    area?: unknown;
    id?: unknown;
    text?: unknown;
    contentKey?: unknown;
    test?: unknown;
  } | null = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const area = body?.area;
  const id = body?.id;
  const text = body?.text;
  const contentKey = body?.contentKey;

  // Each business has its own phrase pools, so the id and contentKey are
  // checked against the engine for THIS page's business.
  const areaInfo = typeof area === "string" ? getReviewAreaBySlug(area) : undefined;
  const engine = areaInfo ? getEngineByKey(engineKeyFor(areaInfo)) : undefined;

  if (
    typeof area !== "string" ||
    !areaInfo ||
    !engine ||
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    id < 0 ||
    id >= engine.TOTAL_COMBINATIONS ||
    typeof text !== "string" ||
    text.length === 0 ||
    text.length > MAX_TEXT_LENGTH ||
    !validContentKey(contentKey, engine.CONTENT_DIMS)
  ) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  // Test mode (admin only): lets the owner try Copy on any page without
  // using up a real review. The flag is honored ONLY with a valid admin
  // session, checked here on the server — a visitor sending test:true
  // just gets a normal claim.
  if (body?.test === true && verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: true, test: true });
  }

  const result = await enqueue(async () => {
    const used = await readUsed();
    if (used.length >= MAX_LEDGER_ENTRIES) {
      return { ok: false as const, full: true as const };
    }
    // contentKey positions only mean something within one business's own
    // pools, so the phrase-overlap rule compares against that business
    // only. Exact-text repeats are rejected across all businesses.
    const engineKey = engineKeyFor(areaInfo);
    const alreadyUsed = used.some(
      (r) =>
        r.text === text ||
        ((r.engine ?? "plumbing") === engineKey &&
          matchingPhraseCount(r.contentKey, contentKey) > MAX_MATCHING_PHRASES),
    );
    const recent = used.filter((r) => (r.engine ?? "plumbing") === engineKey).slice(-RECENCY_WINDOW);
    const repeatsRecentPhrase = engine.RECENCY_SLOTS.some(
      (slot) => contentKey[slot] >= 0 && recent.some((r) => r.contentKey[slot] === contentKey[slot]),
    );
    if (alreadyUsed || repeatsRecentPhrase) {
      return { ok: false as const };
    }
    used.push({ id, area, text, contentKey, engine: engineKey, usedAt: new Date().toISOString() });
    await writeUsed(used);
    return { ok: true as const };
  });

  return NextResponse.json(result);
}
