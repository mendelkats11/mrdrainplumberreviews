import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Server-side ledger of every review that's actually been copied (i.e. a
// visitor intends to post it). This is what makes duplicates impossible,
// not the size of the phrase pool — see lib/review-generator.ts for why
// random generation alone can't guarantee that.
//
// The dedup rule is phrase-overlap, not exact-text match: a candidate is
// rejected if it shares more than 4 of its 6 content phrases (service,
// opening, timeliness, workmanship, pricing, closing) with anything
// already used — otherwise two reviews could differ only in punctuation/
// capitalization (cosmetic, see joinVariants/capitalizationStyles) while
// reading as the same review to anyone comparing them.
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

interface UsedRecord {
  id: number;
  area: string;
  text: string;
  contentKey: number[];
  usedAt: string;
}

async function readUsed(): Promise<UsedRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as UsedRecord[];
  } catch {
    return [];
  }
}

async function writeUsed(records: UsedRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2));
}

function matchingPhraseCount(a: number[], b: number[]): number {
  let count = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] === b[i]) count++;
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
  const body = await req.json().catch(() => null);
  const area = body?.area;
  const id = body?.id;
  const text = body?.text;
  const contentKey = body?.contentKey;

  if (
    typeof area !== "string" ||
    typeof id !== "number" ||
    typeof text !== "string" ||
    !Array.isArray(contentKey) ||
    !contentKey.every((n) => typeof n === "number")
  ) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const result = await enqueue(async () => {
    const used = await readUsed();
    const tooSimilar = used.some(
      (r) => matchingPhraseCount(r.contentKey, contentKey) > MAX_MATCHING_PHRASES,
    );
    if (tooSimilar) {
      return { ok: false as const };
    }
    used.push({ id, area, text, contentKey, usedAt: new Date().toISOString() });
    await writeUsed(used);
    return { ok: true as const };
  });

  return NextResponse.json(result);
}
