// Combinatorial review-text generator. Six CONTENT pools (service,
// opening, timeliness, workmanship, pricing, closing) supply the actual
// substance of a review; two COSMETIC pools (how they're joined into
// sentences, and capitalization style) only affect punctuation/casing,
// never substance.
//
// Every candidate carries a numeric id (for reference/audit) and a
// contentKey — the 6 content-pool indices it was built from. The
// server-side ledger (app/api/claim-review/route.ts) uses contentKey to
// enforce the "no more than 4 matching phrases" rule: two reviews that
// share 5 or 6 of their 6 content phrases are too similar, even if
// cosmetic differences (join style, casing) make the raw text non-
// identical. That's what actually guarantees no duplicates AND no
// near-duplicates — not this file, which only supplies candidates and
// never decides what's "used." A candidate only becomes "used" when it's
// actually copied; regenerating without copying never touches the ledger.

export const services = [
  "bathroom renovation",
  "water heater replacement",
  "bathtub replacement",
  "drain cleaning",
  "toilet repair",
  "pipe repair",
  "sump pump installation",
  "faucet installation",
  "sewer line repair",
  "leak repair",
];

// Bare fragment, no leading capital, no trailing period — punctuation and
// capitalization are added by the join variants below. {service} gets
// substituted in.
const openings = [
  "needed a {service} done and honestly wasnt sure who to call so i just went with mr drain plumber based on the reviews",
  "had a {service} done last week and gotta say it went way better than i expected",
  "called around for a few quotes on a {service} and these guys were the only ones who actually picked up right away",
  "used them for a {service}, my neighbor recommended them and now i get why",
  "needed a {service} kind of last minute and wasnt expecting much honestly",
  "got a {service} done through mr drain plumber, was my first time using them",
  "had a {service} scheduled for like a week out but they ended up squeezing me in earlier",
  "so i needed a {service} and figured id just try these guys since they had decent reviews",
  "finally got around to booking a {service} after putting it off for way too long",
  "called them up for a {service}, wasnt sure what to expect honestly",
];

// Bare verb phrase, implied subject "they" (added by the join variant).
const timeliness = [
  "showed up right when they said they would",
  "got here earlier than the window they gave me",
  "texted before showing up which i appreciated",
  "were a little late but called ahead to give me a heads up",
  "showed up the same day, didnt have to wait around for once",
  "made it out within a couple hours of calling",
  "were right on time, no complaints there",
  "showed up ready to go, no messing around",
];

const workmanship = [
  "explained what he was doing and why before touching anything",
  "cleaned up after himself so you'd barely know anyone had been in the house",
  "didnt try to upsell me on anything i didnt ask for",
  "walked me through the problem instead of just doing it and leaving",
  "was pretty straightforward about what needed fixing and what could wait",
  "double checked everything before calling it done",
  "explained it in plain english instead of talking over my head",
  "took his time instead of rushing through it",
];

const pricing = [
  "price matched what they quoted me over the phone so no surprises there",
  "didnt overcharge me even though it took longer than expected",
  "quoted me a fair price up front and stuck to it",
  "cost ended up being reasonable for the work that got done",
  "was a little pricier than i was hoping for but the work justified it",
  "gave me the price before starting so there were no surprises later",
  "charged exactly what they said they would, nothing extra tacked on",
  "price was fair, definitely didnt feel like i got ripped off",
];

const closings = [
  "would recommend",
  "would use them again for sure",
  "def calling them again if something else comes up",
  "no complaints from me",
  "pretty happy with how it turned out",
  "solid experience overall",
  "cant complain honestly",
  "already told a friend about them",
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Parts {
  opening: string;
  timeliness: string;
  workmanship: string;
  pricing: string;
  closing: string;
}

// Different ways of stitching the 5 clauses together — varies how much it
// reads as one breathless run-on vs a couple of choppier sentences. This
// is cosmetic only: it never changes which phrases were used.
const joinVariants: Array<(p: Parts) => string> = [
  (p) => `${cap(p.opening)}, they ${p.timeliness} and ${p.workmanship}, ${p.pricing}, ${p.closing}.`,
  (p) => `${cap(p.opening)}. They ${p.timeliness}, ${p.workmanship} and ${p.pricing}. ${cap(p.closing)}.`,
  (p) => `${cap(p.opening)}, they ${p.timeliness}. ${cap(p.workmanship)} and ${p.pricing}. ${cap(p.closing)}.`,
  (p) => `${cap(p.opening)} - they ${p.timeliness}, ${p.workmanship}. ${cap(p.pricing)}. ${cap(p.closing)}.`,
];

// Casual capitalization, sprinkled in rather than baked into every
// review. Weighted so "proper" is the most common outcome — most reviews
// should read cleanly, only some should look dashed off on a phone.
const capitalizationStyles: Array<(text: string) => string> = [
  (text) => text,
  (text) => text,
  (text) => text,
  (text) => text.charAt(0).toLowerCase() + text.slice(1),
  (text) => text.toLowerCase(),
  (text) => sprinkleOneSentenceLower(text),
];

function sprinkleOneSentenceLower(text: string): string {
  const boundaries: number[] = [];
  for (let i = 0; i < text.length - 2; i++) {
    if (text[i] === "." && text[i + 1] === " ") boundaries.push(i + 2);
  }
  if (boundaries.length === 0) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
  const pos = boundaries[randInt(boundaries.length)];
  return text.slice(0, pos) + text.charAt(pos).toLowerCase() + text.slice(pos + 1);
}

// Content pools — each index here is one "phrase" for the purposes of
// the 4-matching-phrases rule.
const contentPools = [services, openings, timeliness, workmanship, pricing, closings] as const;
const CONTENT_DIMS = contentPools.map((p) => p.length);

// Cosmetic pools — never count toward phrase-matching.
const cosmeticPools = [joinVariants, capitalizationStyles] as const;
const COSMETIC_DIMS = cosmeticPools.map((p) => p.length);

const ALL_DIMS = [...CONTENT_DIMS, ...COSMETIC_DIMS];

export const TOTAL_CONTENT_COMBINATIONS = CONTENT_DIMS.reduce((a, b) => a * b, 1);
export const TOTAL_COMBINATIONS = ALL_DIMS.reduce((a, b) => a * b, 1);

export interface ReviewCandidate {
  id: number;
  text: string;
  // The 6 content-pool indices this candidate was built from — sent to
  // the server so it can check phrase overlap against everything
  // already used, not just exact text matches.
  contentKey: number[];
}

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function comboId(indices: number[]): number {
  let id = 0;
  for (let i = 0; i < indices.length; i++) {
    id = id * ALL_DIMS[i] + indices[i];
  }
  return id;
}

function buildText(indices: number[]): string {
  const [si, oi, ti, wi, pi, ci, ji, capi] = indices;
  const opening = openings[oi].replaceAll("{service}", services[si]);
  const parts: Parts = {
    opening,
    timeliness: timeliness[ti],
    workmanship: workmanship[wi],
    pricing: pricing[pi],
    closing: closings[ci],
  };
  const raw = joinVariants[ji](parts);
  return capitalizationStyles[capi](raw);
}

export function randomCandidate(): ReviewCandidate {
  const indices = ALL_DIMS.map((size) => randInt(size));
  const contentKey = indices.slice(0, CONTENT_DIMS.length);
  return { id: comboId(indices), text: buildText(indices), contentKey };
}
