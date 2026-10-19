import { promises as fs } from "fs";
import path from "path";
import { readAll, writeAll } from "@/lib/durable-store";
import approved from "@/content/approved-reviews.json";
import type { ReviewArea } from "@/lib/review-areas";

// The renovation pages, and any plumbing page that has approved reviews,
// do not generate text on the fly. Every review a
// visitor can see was written or approved by the owner and lives in
// content/approved-reviews.json (checked into the code, so it deploys with
// it). A visitor can regenerate as often as they like; only COPYING a
// review uses it up. A copied review is recorded in data/claimed-curated.json
// and never offered again, until the pool runs dry.
//
// Caveat, same as the other data/ files: if a redeploy replaces the whole
// app directory, data/claimed-curated.json resets and copied reviews become
// available again. Confirm with Hostinger that data/ survives a deploy.

export interface ApprovedReview {
  // Phrase indices the review was generated from; only used when proposing
  // new batches, to keep the pool varied. Absent once the owner edits a review.
  contentKey?: number[];
  id: string;
  brand: "renomake" | "remodela" | "forge" | "plumbing";
  // The page the review is served on: the city for a renovation business,
  // the area name for a plumbing page. Null means any page of the brand.
  city: string | null;
  text: string;
  addedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

const allApproved = (approved as { reviews: ApprovedReview[] }).reviews;

interface ClaimRecord {
  id: string;
  area: string;
  claimedAt: string;
}

// Copied reviews are kept in several files (see lib/durable-store.ts), so
// that one lost folder does not bring copied reviews back, which would hand
// the same review to two people. All of them are read and combined every
// time, and a claim is written to all of them.
const CLAIMED_NAME = "claimed-curated.json";
const LOCK_DIR = path.join(DATA_DIR, "claimed-curated.lock");

function recordsOf(value: unknown): ClaimRecord[] | null {
  return Array.isArray(value) ? (value as ClaimRecord[]).filter((r) => r && typeof r.id === "string") : null;
}

// Everything claimed so far, from every copy. Read fresh every time (the
// files are small), so a second server process always sees the first one's
// claims instead of a stale copy in memory.
async function readClaimed(): Promise<Map<string, ClaimRecord>> {
  const map = new Map<string, ClaimRecord>();
  for (const { value } of await readAll(CLAIMED_NAME)) {
    for (const r of recordsOf(value) ?? []) {
      const existing = map.get(r.id);
      if (!existing || r.claimedAt < existing.claimedAt) map.set(r.id, r);
    }
  }
  return map;
}

async function persist(map: Map<string, ClaimRecord>): Promise<void> {
  await writeAll(CLAIMED_NAME, [...map.values()]);
}

// One claim at a time across processes: whoever creates the lock folder first
// goes ahead, the rest wait. A lock older than 10 seconds is a leftover from a
// crash and is cleared.
async function withClaimLock<T>(task: () => Promise<T>): Promise<T> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      await fs.mkdir(LOCK_DIR);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const age = Date.now() - (await fs.stat(LOCK_DIR)).mtimeMs;
        if (age > 10_000) await fs.rmdir(LOCK_DIR);
      } catch {
        // Released in the meantime.
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
      if (attempt === 199) throw new Error("could not get the claim lock");
    }
  }
  try {
    return await task();
  } finally {
    await fs.rmdir(LOCK_DIR).catch(() => undefined);
  }
}

// Serializes claims within this process; the file lock above covers other
// processes.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

// What identifies a page's pool: a renovation page by business and city, a
// plumbing page (no brand) by its area name.
export type PoolArea = Pick<ReviewArea, "brand" | "city" | "name">;

function poolBrand(area: PoolArea): ApprovedReview["brand"] {
  return area.brand ?? "plumbing";
}

function poolCity(area: PoolArea): string {
  return area.city ?? area.name;
}

function usableOn(review: ApprovedReview, area: PoolArea): boolean {
  return review.brand === poolBrand(area) && (review.city === null || review.city === poolCity(area));
}

// True once the owner has approved at least one review for this page. A page
// without any keeps its old behavior (the plumbing pages' generator).
export function hasCuratedPool(area: PoolArea): boolean {
  return allApproved.some((r) => usableOn(r, area));
}

// Reviews a page could still offer: right business, right city, not yet copied.
export async function availableReviews(
  area: PoolArea,
): Promise<ApprovedReview[]> {
  const claimed = await readClaimed();
  return allApproved.filter((r) => usableOn(r, area) && !claimed.has(r.id));
}

// A random available review, preferring one that is not in `avoid` so
// Regenerate keeps showing something new. Null when the pool is empty.
export async function pickReview(
  area: PoolArea,
  avoid: string[],
): Promise<ApprovedReview | null> {
  const pool = await availableReviews(area);
  if (pool.length === 0) return null;
  const fresh = pool.filter((r) => !avoid.includes(r.id));
  const choices = fresh.length > 0 ? fresh : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

// Takes a review out of the pool. False if it does not exist, belongs to a
// different business or city, or someone else copied it first.
export async function claimReview(
  area: PoolArea & Pick<ReviewArea, "slug">,
  id: string,
): Promise<{ ok: boolean; text?: string }> {
  return enqueue(() =>
    withClaimLock(async () => {
      const review = allApproved.find((r) => r.id === id);
      if (!review || !usableOn(review, area)) return { ok: false };
      const claimed = await readClaimed();
      if (claimed.has(id)) return { ok: false };
      claimed.set(id, { id, area: area.slug, claimedAt: new Date().toISOString() });
      await persist(claimed);
      return { ok: true, text: review.text };
    }),
  );
}

// For the admin screen: how many copied reviews each place has on record. If
// the app folder has fewer than another place, a redeploy cleared it and the
// other copy restored the list. A place that cannot be written shows no count.
export async function claimStatus(): Promise<{ claimed: number; stores: Array<{ label: string; count: number | null }> }> {
  const copies = await readAll(CLAIMED_NAME);
  return {
    claimed: (await readClaimed()).size,
    stores: copies.map((c) => ({ label: c.label, count: recordsOf(c.value)?.length ?? null })),
  };
}

// Used by the admin screen: how many are left on each page.
export async function remainingFor(area: PoolArea): Promise<number> {
  return (await availableReviews(area)).length;
}
