import { createHumanEngine } from "@/lib/human-engine";
import { buildPlumbingHumanPools } from "@/lib/pools/plumbing-human";

// Engine for proposing Mr. Drain Plumber reviews to approve. Only the
// training scripts use it; the pages serve approved reviews, not this.
export const plumbingHumanEngine = createHumanEngine(buildPlumbingHumanPools());
