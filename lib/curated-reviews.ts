import { promises as fs } from "fs";
import path from "path";
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
const CLAIMED_FILE = path.join(DATA_DIR, "claimed-curated.json");

const allApproved = (approved as { reviews: ApprovedReview[] }).reviews;

interface ClaimRecord {
  id: string;
  area: string;
  claimedAt: string;
}

let cache: Map<string, ClaimRecord> | null = null;

async function readClaimed(): Promise<Map<string, ClaimRecord>> {
  if (cache) return cache;
  const map = new Map<string, ClaimRecord>();
  try {
    const parsed = JSON.parse(await fs.readFile(CLAIMED_FILE, "utf8"));
    if (Array.isArray(parsed)) {
      for (const r of parsed) {
        if (r && typeof r.id === "string") map.set(r.id, r as ClaimRecord);
      }
    }
  } catch {
    // No file yet: nothing has been claimed.
  }
  cache = map;
  return map;
}

// Writes go to a temp file and are renamed into place so a crash mid-write
// cannot leave truncated JSON behind.
async function writeClaimed(map: Map<string, ClaimRecord>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${CLAIMED_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify([...map.values()]));
  await fs.rename(tmp, CLAIMED_FILE);
  cache = map;
}

// Serializes claims within this process so two near-simultaneous copy
// clicks cannot both take the same review.
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
  return enqueue(async () => {
    const review = allApproved.find((r) => r.id === id);
    if (!review || !usableOn(review, area)) return { ok: false };
    const claimed = await readClaimed();
    if (claimed.has(id)) return { ok: false };
    const next = new Map(claimed);
    next.set(id, { id, area: area.slug, claimedAt: new Date().toISOString() });
    await writeClaimed(next);
    return { ok: true, text: review.text };
  });
}

// Used by the admin screen: how many are left on each page.
export async function remainingFor(area: PoolArea): Promise<number> {
  return (await availableReviews(area)).length;
}
