import { createEngine } from "@/lib/review-engine";
import * as plumbing from "@/lib/review-generator";
import { renomakePools } from "@/lib/pools/renomake";
import { remodelaPools } from "@/lib/pools/remodela";
import { forgePools } from "@/lib/pools/forge";
import type { ReviewArea } from "@/lib/review-areas";

// One review engine per business. Every business has its own phrase pools
// (own wording and own duplicate ledger rules), but they all share the
// same engine behavior.

export type Engine = ReturnType<typeof createEngine>;
export type EngineKey = "plumbing" | "renomake" | "remodela" | "forge";

const engines: Record<EngineKey, Engine> = {
  plumbing: {
    randomCandidate: plumbing.randomCandidate,
    CONTENT_DIMS: plumbing.CONTENT_DIMS,
    TOTAL_COMBINATIONS: plumbing.TOTAL_COMBINATIONS,
    TOTAL_CONTENT_COMBINATIONS: plumbing.TOTAL_CONTENT_COMBINATIONS,
  },
  renomake: createEngine(renomakePools),
  remodela: createEngine(remodelaPools),
  forge: createEngine(forgePools),
};

export function engineKeyFor(area: Pick<ReviewArea, "brand">): EngineKey {
  return area.brand ?? "plumbing";
}

export function getEngineByKey(key: EngineKey): Engine {
  return engines[key];
}
