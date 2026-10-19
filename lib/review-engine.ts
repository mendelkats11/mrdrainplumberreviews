// Shared review-generation engine. It knows nothing about any particular
// business: hand it a set of phrase pools (see PhrasePools) and it returns
// an instant, random, human-sounding review. Plumbing and each renovation
// business supply their own pools and get their own engine, so every
// business has its own wording but identical behavior.
//
// How a review is built: eight CONTENT pools (service, opening,
// timeliness, workmanship, pricing, closing, one-liner, one-liner
// service) supply the substance; four COSMETIC choices (how clauses are
// joined, capitalization style, whether the closing shows, and whether
// the review uses the short one-liner format) only affect formatting.
// About 75% of reviews are the short one-liner format.
//
// Every candidate carries a numeric id (for reference) and a contentKey,
// the content-pool indices it was built from. The server-side ledger
// (app/api/claim-review/route.ts) uses contentKey to reject a review that
// shares too many phrases with one already used, plus an exact-text check
// (the short format only renders 2 of the content indices). That ledger,
// not this file, is what actually guarantees no duplicates; this file only
// supplies candidates. A candidate only counts as used when copied.

export interface PhrasePools {
  // Service names for the long format, substituted into {service}.
  services: string[];
  // Service names for the short one-liner format (usually the bigger jobs).
  oneLinerServices: string[];
  // Bare fragment, no leading capital or trailing period. Contains
  // {service}; some entries also contain {area}. LAST entry is the
  // location-mention variant (it contains {area}) and is only used when
  // the location-mention roll selects it.
  openings: string[];
  // Bare verb phrase, implied subject "they". LAST entry = location variant.
  timeliness: string[];
  // Full sentences with an explicit subject. LAST entry = location variant.
  workmanship: string[];
  pricing: string[];
  // Full sentences with a subject, proper capitalization. LAST entry =
  // location variant.
  closings: string[];
  // Complete bare one-line reviews containing {service}.
  oneLiners: string[];
}

export interface ReviewCandidate {
  id: number;
  text: string;
  contentKey: number[];
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uncap(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

interface Parts {
  opening: string;
  timeliness: string;
  workmanship: string;
  pricing: string;
  closing: string;
}

// Different ways of stitching the clauses together. These vary the ORDER
// the clauses appear in, not just punctuation, so reviews don't all share
// one skeleton. `showClosing` lets the closing sentence be dropped
// entirely; a review that always ends on a tidy wrap-up line reads as
// formulaic.
const joinVariants: Array<(p: Parts, showClosing: boolean) => string> = [
  (p, showClosing) =>
    `${cap(p.opening)}. They ${p.timeliness}. ${cap(p.workmanship)}. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. ${cap(p.workmanship)}. They ${p.timeliness}. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. ${cap(p.pricing)}. They ${p.timeliness}. ${cap(p.workmanship)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. ${cap(p.workmanship)}. ${cap(p.pricing)}. They ${p.timeliness}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}, they ${p.timeliness}. ${cap(p.workmanship)}. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. Honestly, ${uncap(p.workmanship)}. They ${p.timeliness} too. ${cap(p.pricing)}.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
  (p, showClosing) =>
    `${cap(p.opening)}. On top of that, ${uncap(p.pricing)}. ${cap(p.workmanship)}. They ${p.timeliness} as well.${showClosing ? ` ${cap(p.closing)}.` : ""}`,
];

// About 1 in 3 reviews skip the closing sentence entirely.
const closingVisibility: boolean[] = [true, true, false];

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

// Casual capitalization, sprinkled in rarely: most reviews read cleanly,
// only a few look dashed off on a phone.
const NORMAL_WEIGHT = 18;
const capitalizationStyles: Array<(text: string) => string> = [
  ...Array.from({ length: NORMAL_WEIGHT }, () => (text: string) => text),
  (text) => text.charAt(0).toLowerCase() + text.slice(1),
  (text) => text.toLowerCase(),
  (text) => sprinkleOneSentenceLower(text),
];

// 75% of reviews use the short one-liner format.
const formatChoices = ["long", "short", "short", "short"] as const;

// One local-keyword mention (e.g. "Brand City") shows up in roughly 1 in 7
// reviews, and never in more than one of the 5 eligible pools at once.
// Showing it everywhere, or in every review, would read as keyword
// stuffing. The location variant is always the LAST entry of each
// eligible pool, so normal draws exclude it (`length - 1`) unless the
// roll selects it.
const LOCATION_MENTION_CHANCE = 7;
const LOCATION_ELIGIBLE_SLOTS = 5;

export function createEngine(pools: PhrasePools) {
  const { services, oneLinerServices, openings, timeliness, workmanship, pricing, closings, oneLiners } = pools;

  const contentPools = [
    services,
    openings,
    timeliness,
    workmanship,
    pricing,
    closings,
    oneLiners,
    oneLinerServices,
  ] as const;
  const CONTENT_DIMS = contentPools.map((p) => p.length);
  const COSMETIC_DIMS = [
    joinVariants.length,
    capitalizationStyles.length,
    closingVisibility.length,
    formatChoices.length,
  ];
  const ALL_DIMS = [...CONTENT_DIMS, ...COSMETIC_DIMS];
  const TOTAL_CONTENT_COMBINATIONS = CONTENT_DIMS.reduce((a, b) => a * b, 1);
  const TOTAL_COMBINATIONS = ALL_DIMS.reduce((a, b) => a * b, 1);

  function comboId(indices: number[]): number {
    let id = 0;
    for (let i = 0; i < indices.length; i++) {
      id = id * ALL_DIMS[i] + indices[i];
    }
    return id;
  }

  function buildText(indices: number[], areaName: string): string {
    const [si, oi, ti, wi, pi, ci, li, hti, ji, capi, cvi, fi] = indices;

    if (formatChoices[fi] === "short") {
      const raw = `${cap(oneLiners[li].replaceAll("{service}", oneLinerServices[hti]))}.`;
      return capitalizationStyles[capi](raw);
    }

    const opening = openings[oi]
      .replaceAll("{service}", services[si])
      .replaceAll("{area}", areaName);
    const parts: Parts = {
      opening,
      timeliness: timeliness[ti].replaceAll("{area}", areaName),
      workmanship: workmanship[wi].replaceAll("{area}", areaName),
      pricing: pricing[pi].replaceAll("{area}", areaName),
      closing: closings[ci].replaceAll("{area}", areaName),
    };
    const raw = joinVariants[ji](parts, closingVisibility[cvi]);
    return capitalizationStyles[capi](raw);
  }

  function randomCandidate(areaName: string): ReviewCandidate {
    const si = randInt(services.length);
    let oi = randInt(openings.length - 1);
    let ti = randInt(timeliness.length - 1);
    let wi = randInt(workmanship.length - 1);
    let pi = randInt(pricing.length - 1);
    let ci = randInt(closings.length - 1);

    let closingHasLocationMention = false;

    if (randInt(LOCATION_MENTION_CHANCE) === 0) {
      switch (randInt(LOCATION_ELIGIBLE_SLOTS)) {
        case 0:
          oi = openings.length - 1;
          break;
        case 1:
          ti = timeliness.length - 1;
          break;
        case 2:
          wi = workmanship.length - 1;
          break;
        case 3:
          pi = pricing.length - 1;
          break;
        default:
          ci = closings.length - 1;
          closingHasLocationMention = true;
          break;
      }
    }

    // Don't let the closing-omission roll silently swallow a location
    // mention that landed in the closing slot; force it visible instead.
    const cvi = closingHasLocationMention
      ? closingVisibility.findIndex((visible) => visible)
      : randInt(closingVisibility.length);

    const li = randInt(oneLiners.length);
    const hti = randInt(oneLinerServices.length);

    const indices = [
      si,
      oi,
      ti,
      wi,
      pi,
      ci,
      li,
      hti,
      randInt(joinVariants.length),
      randInt(capitalizationStyles.length),
      cvi,
      randInt(formatChoices.length),
    ];
    const contentKey = indices.slice(0, CONTENT_DIMS.length);
    return { id: comboId(indices), text: buildText(indices, areaName), contentKey };
  }

  return {
    randomCandidate,
    CONTENT_DIMS,
    TOTAL_COMBINATIONS,
    TOTAL_CONTENT_COMBINATIONS,
    RECENCY_SLOTS: [] as number[],
  };
}
