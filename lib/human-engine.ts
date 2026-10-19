// Review engine for the renovation businesses. Same job and same outward
// shape as lib/review-engine.ts (randomCandidate, CONTENT_DIMS, ...), but
// it assembles reviews the way a person edited them in the training rounds
// (training/): fewer and longer sentences fused with commas and "and",
// "they" for the crew, an optional backstory, an optional extra
// observation, a personal closer, an occasional "as well" afterthought,
// and a closing period that is sometimes left off.
//
// On top of the wording it adds the small habits of people typing fast:
// the business name and city written loosely ("renomake oakville"), some
// lowercase, contractions, and now and then a missing apostrophe, a typo or
// a missing comma.
//
// Content indices (pools) vs cosmetic indices (layout, casing, ending) work
// exactly as in review-engine.ts, so the server-side ledger keeps working.

import { cap, randInt, type PhrasePools, type ReviewCandidate } from "@/lib/review-engine";

export interface HumanPools extends PhrasePools {
  // Business name as it appears in the pools, e.g. "RenoMake".
  brand: string;
  // How people loosely write the name, e.g. "Reno Make".
  nickname: string;
  // For names people type several ways ("Mr. Drain Plumber", "mr drain
  // plumber"): a regex source that finds every spelling, and the lowercase
  // and first-letter forms to use. Default to the brand itself.
  brandPattern?: string;
  lowerForm?: string;
  firstForm?: string;
  // Lowercase clauses. {brand} is replaced by the business name.
  backstories: string[];
  personalClosers: string[];
  // Afterthought fragments like "great pricing as well".
  tags: string[];
  // Lowercase tails for short one-liners.
  shortTails: string[];
  // Verb phrases that follow "They", for an extra observation.
  details: string[];
  // Sentence starters that lead into a clause ("Honestly,").
  leadConnectors: string[];
  // Words that follow a comma and lead into a clause ("plus").
  fuseConnectors: string[];
}

interface Pieces {
  O: string; // opening, capitalized
  M1: string; // first middle sentence, capitalized
  m1: string; // same, lowercase start (for fusing)
  M2: string;
  m2: string;
  K: string; // personal closer as a sentence
  k: string; // personal closer as a clause
  C: string; // regular closing sentence
  g: string; // afterthought tag
  L: string; // lead connector
  F: string; // fuse connector
}

interface Layout {
  // How many of timeliness/workmanship/pricing the layout uses.
  mids: 0 | 1 | 2;
  // Which closer the layout shows.
  closer: "personal" | "closing" | "tag" | "none";
  // The ending is always an exclamation mark.
  bang?: boolean;
  // A backstory sentence would not read right in front of this layout.
  noBackstory?: boolean;
  // Which optional connector pools the layout draws from.
  usesLead?: boolean;
  usesFuse?: boolean;
  build: (p: Pieces) => string;
}

// Each layout is a different sentence skeleton, so long reviews do not all
// share one shape. Most fuse clauses the way the human edits did.
const layouts: Layout[] = [
  { mids: 2, closer: "personal", build: (p) => `${p.O}, ${p.m1}, and ${p.m2}. ${p.K}.` },
  { mids: 2, closer: "personal", build: (p) => `${p.O}. ${p.M1}. ${p.M2}, and ${p.k}.` },
  { mids: 2, closer: "personal", build: (p) => `${p.O}, ${p.m1}. ${p.M2}, and ${p.k}.` },
  { mids: 1, closer: "tag", bang: true, build: (p) => `${p.O}, ${p.m1}, and ${p.g}!` },
  { mids: 2, closer: "closing", build: (p) => `${p.O}. ${p.M1}. ${p.M2}. ${p.C}.` },
  { mids: 2, closer: "personal", build: (p) => `${p.O}. ${p.M1} and ${p.m2}. ${p.K}.` },
  { mids: 1, closer: "closing", build: (p) => `${p.O}, ${p.m1}. ${p.C}.` },
  { mids: 0, closer: "personal", build: (p) => `${p.O}. ${p.K}.` },
  { mids: 2, closer: "personal", noBackstory: true, build: (p) => `${p.K}. ${p.O}, ${p.m1}, and ${p.m2}.` },
  { mids: 2, closer: "personal", usesLead: true, build: (p) => `${p.O}. ${p.M1}. ${p.L} ${p.m2}. ${p.K}.` },
  { mids: 2, closer: "none", usesFuse: true, build: (p) => `${p.O}, ${p.m1}, ${p.F} ${p.m2}.` },
  { mids: 2, closer: "personal", usesFuse: true, build: (p) => `${p.O}, ${p.m1} and ${p.m2}, ${p.F} ${p.k}.` },
  { mids: 1, closer: "personal", usesFuse: true, build: (p) => `${p.O}. ${p.M1}, ${p.F} ${p.k}.` },
  { mids: 1, closer: "tag", build: (p) => `${p.O}. ${p.M1}. ${cap(p.g)}.` },
];

// Which two of [timeliness, workmanship, pricing] a two-clause layout uses,
// in which order. 0 = timeliness, 1 = workmanship, 2 = pricing.
const midPairs: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [0, 2],
  [2, 0],
  [1, 2],
  [2, 1],
];

// About 1 in 3 long reviews open with a short backstory sentence, and about
// 1 in 3 get an extra observation.
const backstoryChoices = [false, false, true];
const detailChoices = [false, false, true];

// About 2 in 5 short reviews get a personal tail.
const shortTailChoices = [true, false, true, false, false];

// Casing of the whole review: 12 clean, 2 lowercase first letter, 4 all
// lowercase, 2 one sentence lowercase. Together with the loose brand and
// city spellings about half of all reviews look casually typed.
const CAP_NORMAL = 12;
const CAP_FIRST_LOWER = 2;
const CAP_ALL_LOWER = 4;
const CAP_SPRINKLE = 2;
const CAPITALIZATION_STYLE_COUNT = CAP_NORMAL + CAP_FIRST_LOWER + CAP_ALL_LOWER + CAP_SPRINKLE;

// How the business name is written. Weighted: most often as is, otherwise
// lowercase, first letter only, or a nickname.
type BrandStyle = "proper" | "lower" | "first" | "nick";
const brandStyles: BrandStyle[] = [
  ...Array.from({ length: 9 }, () => "proper" as const),
  ...Array.from({ length: 5 }, () => "lower" as const),
  ...Array.from({ length: 3 }, () => "first" as const),
  ...Array.from({ length: 3 }, () => "nick" as const),
];

// How the city is written: usually capitalized, sometimes lowercase.
const cityStyles = ["proper", "proper", "lower"] as const;

// About half of reviews use contractions ("we're", "couldn't").
const contractChoices = [false, true];

// Small imperfections, not too often: 9 of 12 reviews have none.
type Imperfection = "none" | "apostrophes" | "typo" | "commas";
const imperfections: Imperfection[] = [
  ...Array.from({ length: 9 }, () => "none" as const),
  "apostrophes",
  "typo",
  "commas",
];

// Mostly a normal period, sometimes none (people dash these off), now and
// then an exclamation mark.
const endStyles = [".", ".", "", "!"] as const;

// Short one-liners: about 8 in 10 end with no punctuation, 1 in 10 with a
// period, 1 in 10 with an exclamation mark.
function shortEnding(): string {
  const roll = randInt(10);
  return roll < 8 ? "" : roll === 8 ? "." : "!";
}

const formatChoices = ["long", "short", "short", "short"] as const;

// Content positions (see contentPools) of the distinctive phrases that must
// not repeat close together: openings, closings, backstories, personal
// closers, tags and details. The ledger enforces this across visitors; the
// engine's own memory below enforces it within one session.
const RECENCY_SLOTS = [1, 5, 8, 9, 10, 12];

// Positions the engine keeps a short memory for, so a regenerate or a
// batch of samples does not hand back the same phrase twice in a row.
const COOLDOWN_SLOTS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12];
const COOLDOWN_FRACTION = 0.5;

const LOCATION_MENTION_CHANCE = 7;
const LOCATION_ELIGIBLE_SLOTS = 5;

const contractions: Array<[RegExp, string]> = [
  [/\bwe are\b/gi, "we're"],
  [/\bi am\b/gi, "i'm"],
  [/\bit is\b/gi, "it's"],
  [/\bthat is\b/gi, "that's"],
  [/\bthey are\b/gi, "they're"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bdo not\b/gi, "don't"],
  [/\bwe have (?=already|just|been|dealt|recommended|used|had|done|never|finally|hired)/gi, "we've "],
  [/\bi have (?=already|just|been|never|recommended|used)/gi, "i've "],
];

// Typos real people make. Whole words only; one per review at most.
const typos: Array<[RegExp, string]> = [
  [/\bdefinitely\b/i, "definately"],
  [/\brecommend\b/i, "reccomend"],
  [/\brecommended\b/i, "reccomended"],
  [/\breceived\b/i, "recieved"],
  [/\bprofessional\b/i, "proffesional"],
  [/\bexcellent\b/i, "excelent"],
  [/\bbeautiful\b/i, "beautifull"],
  [/\bwonderful\b/i, "wonderfull"],
  [/\breally\b/i, "realy"],
  [/\bespecially\b/i, "especialy"],
  [/\bcompletely\b/i, "completly"],
  [/\bexperience\b/i, "experiance"],
  [/\ba lot\b/i, "alot"],
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace a match with `replacement`, keeping the match's leading capital.
function keepLeadingCase(match: string, replacement: string): string {
  return /^[A-Z]/.test(match) ? cap(replacement) : replacement;
}

export function createHumanEngine(pools: HumanPools) {
  const {
    brand,
    nickname,
    services,
    oneLinerServices,
    openings,
    timeliness,
    workmanship,
    pricing,
    closings,
    oneLiners,
    backstories,
    personalClosers,
    tags,
    shortTails,
    details,
    leadConnectors,
    fuseConnectors,
  } = pools;

  const contentPools = [
    services,
    openings,
    timeliness,
    workmanship,
    pricing,
    closings,
    oneLiners,
    oneLinerServices,
    backstories,
    personalClosers,
    tags,
    shortTails,
    details,
    leadConnectors,
    fuseConnectors,
  ] as const;
  const CONTENT_DIMS = contentPools.map((p) => p.length);
  const COSMETIC_DIMS = [
    layouts.length,
    midPairs.length,
    backstoryChoices.length,
    detailChoices.length,
    shortTailChoices.length,
    CAPITALIZATION_STYLE_COUNT,
    brandStyles.length,
    cityStyles.length,
    contractChoices.length,
    imperfections.length,
    endStyles.length,
    formatChoices.length,
  ];
  const ALL_DIMS = [...CONTENT_DIMS, ...COSMETIC_DIMS];
  const TOTAL_CONTENT_COMBINATIONS = CONTENT_DIMS.reduce((a, b) => a * b, 1);
  const TOTAL_COMBINATIONS = ALL_DIMS.reduce((a, b) => a * b, 1);

  const brandSource = pools.brandPattern ?? escapeRegExp(brand);
  const brandPattern = new RegExp(brandSource, "gi");
  const lowerForm = pools.lowerForm ?? brand.toLowerCase();
  const firstForm = pools.firstForm ?? cap(brand.toLowerCase());

  // Recently shown phrase indices per content position.
  const recent = new Map<number, number[]>();

  // Pick a phrase index below `size` that was not shown recently.
  function pickFresh(slot: number, size: number): number {
    const history = recent.get(slot) ?? [];
    let index = randInt(size);
    for (let i = 0; i < 30 && history.includes(index); i++) index = randInt(size);
    return index;
  }

  function remember(slot: number, index: number) {
    const history = recent.get(slot) ?? [];
    history.push(index);
    const limit = Math.floor(CONTENT_DIMS[slot] * COOLDOWN_FRACTION);
    while (history.length > limit) history.shift();
    recent.set(slot, history);
  }

  // Which content positions a review actually shows. The rest are marked -1
  // in the contentKey so the ledger only compares phrases a reader sees.
  function shownPositions(indices: number[], layoutIndex: number): Set<number> {
    const shown = new Set<number>();
    const li = indices[6];
    const [pairIndex, backstoryIndex, detailIndex, tailIndex] = indices.slice(CONTENT_DIMS.length + 1, CONTENT_DIMS.length + 5);
    if (formatChoices[indices[ALL_DIMS.length - 1]] === "short") {
      shown.add(6).add(7);
      if (shortTailChoices[tailIndex] && !oneLiners[li].includes(",")) shown.add(11);
      return shown;
    }
    const layout = layouts[layoutIndex];
    shown.add(0).add(1);
    const [a, b] = midPairs[pairIndex];
    if (layout.mids >= 1) shown.add(2 + a);
    if (layout.mids === 2) shown.add(2 + b);
    if (layout.closer === "personal") shown.add(9);
    if (layout.closer === "closing") shown.add(5);
    if (layout.closer === "tag") shown.add(10);
    if (backstoryChoices[backstoryIndex] && !layout.noBackstory) shown.add(8);
    if (detailChoices[detailIndex]) shown.add(12);
    if (layout.usesLead) shown.add(13);
    if (layout.usesFuse) shown.add(14);
    return shown;
  }

  function comboId(indices: number[]): number {
    let id = 0;
    for (let i = 0; i < indices.length; i++) {
      id = id * ALL_DIMS[i] + indices[i];
    }
    return id;
  }

  // Lowercase the first letter so a sentence can be fused into the one
  // before it, unless it starts with "I" or the business name.
  function clause(s: string): string {
    if (/^I(\s|')/.test(s) || s.startsWith(brand)) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  // Lowercase the word that starts at `pos`: the whole word for the
  // business name (so it never turns into "fORGE"), the first letter
  // otherwise, and never the pronoun "I".
  function lowerWordAt(text: string, pos: number): string {
    const word = text.slice(pos).match(/^[A-Za-z]+/)?.[0] ?? "";
    if (word === "I") return text;
    if (word === brand) return text.slice(0, pos) + word.toLowerCase() + text.slice(pos + word.length);
    return text.slice(0, pos) + text.charAt(pos).toLowerCase() + text.slice(pos + 1);
  }

  function applyCapitalization(text: string, style: number): string {
    if (style < CAP_NORMAL) return text;
    if (style < CAP_NORMAL + CAP_FIRST_LOWER) return lowerWordAt(text, 0);
    if (style < CAP_NORMAL + CAP_FIRST_LOWER + CAP_ALL_LOWER) return text.toLowerCase();
    const boundaries: number[] = [];
    for (let i = 0; i < text.length - 2; i++) {
      if ((text[i] === "." || text[i] === "!") && text[i + 1] === " ") boundaries.push(i + 2);
    }
    if (boundaries.length === 0) return lowerWordAt(text, 0);
    return lowerWordAt(text, boundaries[randInt(boundaries.length)]);
  }

  // The pools write the pronoun as a bare "i"; it is always "I".
  function fixPronoun(text: string): string {
    return text.replace(/\bi\b/g, "I");
  }

  function contract(text: string): string {
    let out = text;
    for (const [pattern, replacement] of contractions) {
      out = out.replace(pattern, (m) => keepLeadingCase(m, replacement));
    }
    return fixPronoun(out);
  }

  function dropApostrophes(text: string): string {
    return text
      .replace(/\b(\w+)n't\b/g, "$1nt")
      .replace(/\b(i'm|it's|we've|i've|that's|i'd)\b/gi, (m) => m.replace("'", ""));
  }

  function addTypo(text: string): string {
    const start = randInt(typos.length);
    for (let i = 0; i < typos.length; i++) {
      const [pattern, wrong] = typos[(start + i) % typos.length];
      if (pattern.test(text)) return text.replace(pattern, (m) => keepLeadingCase(m, wrong));
    }
    return text;
  }

  function dropJoinCommas(text: string): string {
    // Each join comma has a 60% chance of going missing.
    return text.replace(/,(?= (?:and|they|we|i|it|the|our|plus|honestly|also)\b)/gi, (m) => (Math.random() < 0.6 ? "" : m));
  }

  function applyImperfection(text: string, kind: Imperfection): string {
    switch (kind) {
      case "apostrophes":
        return dropApostrophes(text);
      case "typo":
        return addTypo(text);
      case "commas":
        return dropJoinCommas(text);
      default:
        return text;
    }
  }

  // Rewrite every mention of the business name and city the way a person
  // would loosely type them. Runs after casing, so a mention that casing
  // already lowercased stays lowercase.
  function applyNameStyles(text: string, brandStyle: BrandStyle, cityStyle: "proper" | "lower", areaName: string): string {
    let out = text.replace(brandPattern, (m) => {
      const upper = /^[A-Z]/.test(m);
      const surface =
        brandStyle === "lower" ? lowerForm
        : brandStyle === "first" ? firstForm
        : brandStyle === "nick" ? nickname
        : brand;
      return upper ? surface : surface.toLowerCase();
    });
    if (cityStyle === "lower") {
      out = out.replace(new RegExp(escapeRegExp(areaName), "gi"), (m) => m.toLowerCase());
    }
    return out;
  }

  function applyEnding(text: string, endIndex: number, forceBang: boolean): string {
    const body = text.replace(/[.!]+$/, "");
    return body + (forceBang ? "!" : endStyles[endIndex]);
  }

  // Put an extra sentence after the first sentence, or at the end when the
  // review is a single sentence.
  function insertDetail(text: string, detail: string): string {
    const boundary = text.search(/(?<!\bMr)[.!?] (?=[A-Z])/);
    if (boundary === -1) return `${text.replace(/[.!]+$/, "")}. ${detail}.`;
    return `${text.slice(0, boundary + 1)} ${detail}.${text.slice(boundary + 1)}`;
  }

  function finish(
    raw: string,
    capIndex: number,
    contractIndex: number,
    kind: Imperfection,
    brandStyle: BrandStyle,
    cityStyle: "proper" | "lower",
    endIndex: number,
    forceBang: boolean,
    areaName: string,
    endingOverride?: string,
  ): string {
    let text = fixPronoun(applyCapitalization(raw, capIndex));
    if (contractChoices[contractIndex] || kind === "apostrophes") text = contract(text);
    text = applyImperfection(text, kind);
    text = applyNameStyles(text, brandStyle, cityStyle, areaName);
    if (endingOverride !== undefined) return text.replace(/[.!]+$/, "") + endingOverride;
    return applyEnding(text, endIndex, forceBang);
  }

  function buildText(indices: number[], areaName: string): string {
    const [
      si, oi, ti, wi, pi, ci, li, hti, bi, ki, gi, sti, di, lci, fci,
      layoutIndex, pairIndex, backstoryIndex, detailIndex, tailIndex,
      capIndex, brandStyleIndex, cityStyleIndex, contractIndex, imperfectIndex, endIndex, fi,
    ] = indices;
    const brandStyle = brandStyles[brandStyleIndex];
    const cityStyle = cityStyles[cityStyleIndex];
    const kind = imperfections[imperfectIndex];

    if (formatChoices[fi] === "short") {
      let raw = cap(oneLiners[li].replaceAll("{service}", oneLinerServices[hti]));
      if (shortTailChoices[tailIndex] && !raw.includes(",")) raw += `, ${shortTails[sti]}`;
      return finish(raw, capIndex, contractIndex, kind, brandStyle, cityStyle, endIndex, false, areaName, shortEnding());
    }

    const fill = (s: string) => s.replaceAll("{brand}", brand).replaceAll("{area}", areaName);
    const sentenceFor = [
      `They ${fill(timeliness[ti])}`,
      fill(workmanship[wi]),
      fill(pricing[pi]),
    ];
    const [a, b] = midPairs[pairIndex];
    const personal = fill(personalClosers[ki]);
    const pieces: Pieces = {
      O: cap(fill(openings[oi].replaceAll("{service}", services[si]))),
      M1: sentenceFor[a],
      m1: clause(sentenceFor[a]),
      M2: sentenceFor[b],
      m2: clause(sentenceFor[b]),
      K: cap(personal),
      k: personal,
      C: fill(closings[ci]),
      g: tags[gi],
      L: leadConnectors[lci],
      F: fuseConnectors[fci],
    };
    const layout = layouts[layoutIndex];
    let raw = layout.build(pieces);
    if (detailChoices[detailIndex]) raw = insertDetail(raw, `They ${details[di]}`);
    if (backstoryChoices[backstoryIndex] && !layout.noBackstory) {
      raw = `${cap(fill(backstories[bi]))}. ${raw}`;
    }
    return finish(raw, capIndex, contractIndex, kind, brandStyle, cityStyle, endIndex, !!layout.bang, areaName);
  }

  // True when two stretches of the review say the same thing, e.g. the
  // opening ends "and forge delivered" and the closing is "Forge delivered".
  function repeatsItself(text: string): boolean {
    const chunks = text
      .toLowerCase()
      .split(/[.!?,]| and /)
      .map((c) => c.trim())
      .filter((c) => c.split(" ").length >= 2);
    return chunks.some((c, i) => chunks.some((other, j) => i !== j && other.includes(c)));
  }

  // A verdict that opens a review has nothing for "it" to point back to
  // ("It was worth the wait. We hired..."), so redraw those.
  function opensWithDanglingIt(text: string): boolean {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length < 2) return false;
    return /\b(it|it's)\b/i.test(sentences[0]) && !new RegExp(brandSource, "i").test(sentences[0]);
  }

  function randomCandidate(areaName: string): ReviewCandidate {
    let candidate = drawCandidate(areaName);
    for (
      let i = 0;
      i < 12 && (repeatsItself(candidate.text) || opensWithDanglingIt(candidate.text));
      i++
    ) {
      candidate = drawCandidate(areaName);
    }
    return candidate;
  }

  function drawCandidate(areaName: string): ReviewCandidate {
    const si = randInt(services.length);
    let oi = pickFresh(1, openings.length - 1);
    let ti = pickFresh(2, timeliness.length - 1);
    let wi = pickFresh(3, workmanship.length - 1);
    let pi = pickFresh(4, pricing.length - 1);
    let ci = pickFresh(5, closings.length - 1);

    // 0 = none, 1..3 = timeliness/workmanship/pricing, 4 = closing.
    let locationSlot = 0;
    if (randInt(LOCATION_MENTION_CHANCE) === 0) {
      switch (randInt(LOCATION_ELIGIBLE_SLOTS)) {
        case 0:
          oi = openings.length - 1;
          break;
        case 1:
          ti = timeliness.length - 1;
          locationSlot = 1;
          break;
        case 2:
          wi = workmanship.length - 1;
          locationSlot = 2;
          break;
        case 3:
          pi = pricing.length - 1;
          locationSlot = 3;
          break;
        default:
          ci = closings.length - 1;
          locationSlot = 4;
          break;
      }
    }

    // The location variant must actually appear in the text, so constrain
    // the layout and clause pair to ones that show that slot.
    let layoutChoices = layouts.map((_, i) => i);
    let pairChoices = midPairs.map((_, i) => i);
    if (locationSlot >= 1 && locationSlot <= 3) {
      const mid = locationSlot - 1;
      layoutChoices = layoutChoices.filter((i) => layouts[i].mids === 2);
      pairChoices = pairChoices.filter((i) => midPairs[i].includes(mid));
    } else if (locationSlot === 4) {
      layoutChoices = layoutChoices.filter((i) => layouts[i].closer === "closing");
    }
    const layoutIndex = layoutChoices[randInt(layoutChoices.length)];
    const pairIndex = pairChoices[randInt(pairChoices.length)];

    const indices = [
      si,
      oi,
      ti,
      wi,
      pi,
      ci,
      pickFresh(6, oneLiners.length),
      randInt(oneLinerServices.length),
      pickFresh(8, backstories.length),
      pickFresh(9, personalClosers.length),
      pickFresh(10, tags.length),
      pickFresh(11, shortTails.length),
      pickFresh(12, details.length),
      randInt(leadConnectors.length),
      randInt(fuseConnectors.length),
      layoutIndex,
      pairIndex,
      randInt(backstoryChoices.length),
      randInt(detailChoices.length),
      randInt(shortTailChoices.length),
      randInt(CAPITALIZATION_STYLE_COUNT),
      randInt(brandStyles.length),
      randInt(cityStyles.length),
      randInt(contractChoices.length),
      randInt(imperfections.length),
      randInt(endStyles.length),
      randInt(formatChoices.length),
    ];
    const shown = shownPositions(indices, layoutIndex);
    for (const slot of COOLDOWN_SLOTS) {
      if (shown.has(slot)) remember(slot, indices[slot]);
    }
    const contentKey = indices.slice(0, CONTENT_DIMS.length).map((v, i) => (shown.has(i) ? v : -1));
    return { id: comboId(indices), text: buildText(indices, areaName), contentKey };
  }

  return {
    randomCandidate,
    CONTENT_DIMS,
    TOTAL_COMBINATIONS,
    TOTAL_CONTENT_COMBINATIONS,
    RECENCY_SLOTS,
  };
}
