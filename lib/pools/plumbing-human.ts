import type { HumanPools } from "@/lib/human-engine";
import { plumbingPools } from "@/lib/review-generator";

// Mr. Drain Plumber wording for the human engine (lib/human-engine.ts),
// used to propose reviews for the owner to approve. The base wording is the
// original plumbing pools, tidied the way the renovation pools were:
// "they" for the plumber, the business name written one way (the engine then
// varies it), and no claims about discounts, warranties or after hours
// pricing that nobody has confirmed. No hyphens anywhere.

const BRAND = "Mr. Drain Plumber";

// Entries that promise something the business may not offer.
const UNCONFIRMED = /discount|warranty|guarantee|follow up visit|after hours|insured|licensed|free\b|no charge|for free|threw in|on the house|waived|complimentary|charge extra|extra for the|didn't charge|did not charge|same day estimate|financing|payment plan|cash or card|matched a quote|emergency call|digitally|track their arrival|link they sent|squeezed|specialist|consulted|subcontract|charging extra|cost a bit more|himself/i;

// Lines about one kind of job ("matched the rest of the bathroom") are dropped
// from the pools that are paired with any service.
const SPECIFIC_JOB = /fixture|bathroom|toilet|kitchen|tile|faucet|\bsink|shower|basement|water heater|sewer|clog|\bdrain|pipe|valve|\bleak|sump|yard|lawn/i;

// Openings that describe one particular problem. They were written for any
// service, so "our water heater died" could end up in front of "sewer line
// repair". The human engine pairs them at random, so only generic ones stay.
const SYMPTOM = /water heater died|gurgling|running nonstop|noise in the pipes|pipe burst|water damage|slow drip|water bill|leak|standing water|old pipes|flooded|ceiling|stain|smell|sewer|drain|clog|backed up|burst|frozen|pressure|noise|drip|rust|mold|pooling|sounded weird|water coming|neighbor told/i;

const APOSTROPHES: Array<[RegExp, string]> = [
  [/\bim\b/gi, "I'm"],
  [/\bive\b/gi, "I've"],
  [/\bcant\b/gi, "can't"],
  [/\bwont\b/gi, "won't"],
  [/\bdont\b/gi, "don't"],
  [/\bdidnt\b/gi, "didn't"],
  [/\bdoesnt\b/gi, "doesn't"],
  [/\bwasnt\b/gi, "wasn't"],
  [/\bwerent\b/gi, "weren't"],
  [/\bisnt\b/gi, "isn't"],
  [/\barent\b/gi, "aren't"],
  [/\bhasnt\b/gi, "hasn't"],
  [/\bhavent\b/gi, "haven't"],
  [/\bhadnt\b/gi, "hadn't"],
  [/\bwouldnt\b/gi, "wouldn't"],
  [/\bcouldnt\b/gi, "couldn't"],
  [/\bshouldnt\b/gi, "shouldn't"],
  [/\bweve\b/gi, "we've"],
  [/\bwed\b/gi, "we'd"],
  [/\btheyd\b/gi, "they'd"],
  [/\btheyve\b/gi, "they've"],
  [/\btheres\b/gi, "there's"],
  [/\bthats\b/gi, "that's"],
  [/\bwhats\b/gi, "what's"],
];

function fixApostrophes(text: string): string {
  return APOSTROPHES.reduce(
    (out, [pattern, right]) => out.replace(pattern, (m) => (/^[A-Z]/.test(m) ? right.charAt(0).toUpperCase() + right.slice(1) : right)),
    text,
  );
}

function tidy(entry: string, subjectIsPlumber: boolean): string {
  let s = fixApostrophes(entry).replace(/mr\.? drain plumber/gi, BRAND);
  if (subjectIsPlumber) {
    s = s
      .replace(/^(?:The (?:Mr\. Drain Plumber \{area\} )?(?:plumber|guy|technician|tech)) was /, "They were ")
      .replace(/^(?:The (?:plumber|guy|technician|tech)|He) /, "They ")
      .replace(/^The Mr\. Drain Plumber \{area\} (?:guy|plumber)/, "The Mr. Drain Plumber {area} crew");
  }
  return s
    .replace(/\bHe's\b/g, "They're")
    .replace(/\bhe's\b/g, "they're")
    .replace(/\b(he|He) (was|wasn't|is|isn't|has|hasn't|does|doesn't)\b/g, (_m, who: string, verb: string) => {
      const they = who === "He" ? "They" : "they";
      const plural: Record<string, string> = { was: "were", "wasn't": "weren't", is: "are", "isn't": "aren't", has: "have", "hasn't": "haven't", does: "do", "doesn't": "don't" };
      return `${they} ${plural[verb]}`;
    })
    .replace(/\bHe\b/g, "They")
    .replace(/\bhe\b/g, "they")
    .replace(/\bhis\b/g, "their")
    .replace(/\bhim\b/g, "them")
    .replace(/\b(the|this|that) guy\b/gi, (m) => m.replace(/guy/i, "crew"))
    .replace(/\bfriendly guy\b/g, "friendly crew")
    .replace(/\bThey (was|wasn't|has|hasn't|does|doesn't|is|isn't)\b/g, (_m, verb: string) => {
      const plural: Record<string, string> = { was: "were", "wasn't": "weren't", is: "are", "isn't": "aren't", has: "have", "hasn't": "haven't", does: "do", "doesn't": "don't" };
      return `They ${plural[verb]}`;
    })
    .replace(/\bthey (was|wasn't|has|hasn't|does|doesn't|is|isn't)\b/g, (_m, verb: string) => {
      const plural: Record<string, string> = { was: "were", "wasn't": "weren't", is: "are", "isn't": "aren't", has: "have", "hasn't": "haven't", does: "do", "doesn't": "don't" };
      return `they ${plural[verb]}`;
    });
}

// Keep the location variant (the LAST entry) in place; drop the others only
// if they make an unconfirmed promise.
function rework(entries: string[], subjectIsPlumber: boolean, dropSymptoms = false, dropJobSpecific = false): string[] {
  const last = entries.length - 1;
  return entries
    .filter((e, i) => i === last || !(UNCONFIRMED.test(e) || (dropSymptoms && SYMPTOM.test(e))))
    .filter((e, i) => i === last || !(dropJobSpecific && SPECIFIC_JOB.test(e)))
    .filter((e) => !(subjectIsPlumber && /himself/i.test(e)))
    .map((e) => tidy(e, subjectIsPlumber));
}

export const plumbingBackstories = [
  "we had a bad experience with another plumber a few months back",
  "a neighbour recommended them",
  "we found them online at the last minute",
  "we called three places and these were the only ones who picked up",
  "my landlord told me to find someone quickly",
  "we bought the house last year and the plumbing was a mystery",
  "we put off calling a plumber because we figured it would be expensive",
  "i was skeptical because i have been burned by plumbers before",
  "it was a long weekend and we didn't think anyone would come out",
  "it was the middle of winter and we needed it done right",
  "we were hosting people that weekend",
  "i had never hired a plumber on my own before",
  "a friend swore by them",
  "my parents have used them for years",
  "we had been putting it off for months",
  "the problem kept getting worse so we finally made the call",
  "we compared a few quotes first",
  "we were nervous about the cost",
  "i read the reviews before calling",
  "we were stressed and needed it fixed fast",
  "i left it too long and regretted it",
  "we wanted it done properly the first time",
  "i tried fixing it myself first and made it worse",
  "my realtor suggested we get it looked at",
  "we had somebody coming over and needed it sorted",
];

export const plumbingClosers = [
  "overall i had a great experience with them",
  "we're really happy with how it turned out",
  "i would call them again without a second thought",
  "they've got our number saved now",
  "i'd recommend them to anyone with a plumbing problem",
  "the problem hasn't come back since",
  "everything has worked perfectly since",
  "it was fixed faster than we thought possible",
  "i'm glad we called them instead of trying to fix it ourselves",
  "we're telling the neighbours about them",
  "i feel a lot better knowing who to call next time",
  "five stars from us",
  "they saved our weekend",
  "it was the least stressful plumbing job we've ever had",
  "we'd use them again in a heartbeat",
  "it's nice to finally have a plumber we trust",
  "it was money well spent",
  "i'd happily call {brand} again",
  "they made a stressful day a lot easier",
  "honestly one of the best service calls we've had",
  "it feels good to have it done right",
  "we've already passed their number to family",
  "we slept a lot better that night",
  "the whole thing was over faster than expected",
  "we couldn't ask for better service",
  "it was a relief to have it sorted",
  "the problem is finally behind us",
  "everything is working great now",
  "we're so glad it's finally taken care of",
  "the house feels right again",
];

export const plumbingTags = [
  "great communication as well",
  "fair pricing as well",
  "a fast response as well",
  "a clean work area as well",
  "a friendly crew as well",
  "honest advice as well",
  "no pushy upsell either",
  "easy booking too",
  "really polite too",
  "no mess left behind either",
  "quick response too",
  "clear pricing too",
];

export const plumbingShortTails = [
  "super happy with the service",
  "would call them again",
  "highly recommend",
  "fast and friendly",
  "five stars",
  "thank you again",
  "no complaints at all",
  "problem solved",
  "fixed right the first time",
  "great service",
  "so glad we called",
  "will be calling again",
  "quick and professional",
  "honest and fair",
  "very pleased",
  "can't recommend them enough",
  "saved our weekend",
  "what a relief",
  "worth the call",
  "great people",
];

// Verb phrases that follow "They".
export const plumbingDetails = [
  "wore shoe covers inside without being asked",
  "showed us the cause of the problem on their phone",
  "explained what caused the problem",
  "cleaned up the work area before leaving",
  "put down drop cloths first",
  "took the time to answer all our questions",
  "texted when they were on the way",
  "called back right away",
  "walked us through how to avoid the problem next time",
  "offered a couple of options and let us choose",
  "checked the whole line instead of guessing",
  "tested everything twice before leaving",
  "kept the noise down while the baby was sleeping",
  "double checked that the water was running properly",
  "were respectful of our home",
  "took photos of the work for us",
  "were patient with all of our questions",
  "didn't push anything we didn't need",
  "pointed out a small problem before it got bigger",
  "were calm and reassuring when we were stressed",
  "stayed until everything was running properly",
  "dealt with the mess so we didn't have to",
  "arrived with the right parts the first time",
  "gave us a straight answer on what could wait",
  "were clear about the price before they started",
];

// More one-liners, so a batch of a few hundred shorts is not built from the
// same two dozen lines.
export const plumbingExtraOneLiners = [
  "so glad we called mr drain plumber for our {service}",
  "our {service} was done right and on time",
  "can't say enough good things about the {service} they did for us",
  "honest advice and fair pricing on our {service}",
  "they kept the mess to a minimum during our {service}",
  "fast response and a clean finish on our {service}",
  "super easy to deal with for our {service}",
  "no surprises on the bill for our {service}, thank you",
  "they explained everything about our {service} before starting",
  "the {service} was finished sooner than we expected",
  "very professional team for our {service}",
  "they treated our home with respect during the {service}",
  "exactly what we needed for our {service}",
  "would hire them again after our {service}",
  "reliable, tidy and honest on our {service}",
  "great communication from the first call to the end of our {service}",
  "they made our {service} a lot less stressful than we feared",
  "{service} done properly the first time, highly recommend",
  "polite crew and quality work on our {service}",
  "booked easily and the {service} went smoothly",
  "five stars for our {service}",
  "cannot recommend them enough for our {service}",
  "the plumber took the time to explain our {service}",
  "clear pricing and careful work on our {service}",
  "they showed up when they said and handled our {service}",
  "really pleased with how the {service} turned out",
  "good people who know what they are doing, {service} handled perfectly",
  "no pressure, no upsell, just a solid {service}",
  "the whole {service} was painless from start to finish",
  "thanks for the great job on our {service}",
  "came through for us on our {service} when we needed it most",
  "worth every penny for our {service}",
  "our {service} looks and works great",
  "friendly, fast and fair for our {service}",
  "they went the extra mile on our {service}",
  "solid workmanship on the {service}, will call again",
  "great value for our {service}",
  "easy to book and easy to trust, our {service} went well",
  "dependable plumbers, perfect {service}",
  "we have used them before and would again for a {service}",
  "great service on our {service}, super happy",
  "quick, clean and careful on our {service}",
  "they handled our {service} like pros",
  "it was a relief having them handle our {service}",
  "the {service} went exactly as they said it would",
  "couldn't be happier with our {service}",
  "a great experience from start to finish on our {service}",
  "they got our {service} done without any fuss",
  "very happy with the quality of our {service}",
  "so thankful for the fast help with our {service}",
  "honest and hard working crew for our {service}",
  "no complaints at all about our {service}",
  "they came prepared and finished our {service} quickly",
  "highly recommend them for our {service}",
  "they answered every question about our {service}",
  "thorough work on our {service}, nothing was rushed",
  "the team made our {service} feel simple",
  "great experience with the {service}, would use again",
  "kind, quick and professional on our {service}",
  "the {service} was handled right, thank you",
  "we love how our {service} turned out",
  "perfect job on our {service}",
  "fair prices and quality work for our {service}",
  "they fit us in fast for our {service}",
  "no mess left behind after our {service}",
  "responsive, polite and skilled on our {service}",
  "our {service} problem is solved and we're happy",
  "very satisfied with our {service}",
  "thank you for taking care of our {service} so well",
  "the best plumbers we have used for our {service}",
  "straight talk and good work on our {service}",
  "everything about our {service} was handled professionally",
  "they made sure our {service} was done right before they left",
  "gave us a fair quote and stuck to it for our {service}",
  "so impressed with how they handled our {service}",
  "the crew was on time and our {service} looks great",
  "fantastic service on our {service}, thank you",
  "they respected our schedule during the {service}",
  "our {service} was a breeze with these guys",
  "excellent work and good communication on our {service}",
  "they cleaned up everything after our {service}",
  "would not hesitate to call them again for our {service}",
  "very reasonable and very skilled on our {service}",
  "the {service} was done carefully and quickly",
  "great team, great price, great {service}",
  "they answered the phone right away about our {service}",
  "no hassle at all with our {service}",
  "they took the time to do our {service} properly",
  "friendly service and a job well done on our {service}",
  "reliable team, and the {service} was done right",
  "they were upfront about everything on our {service}",
  "we are so happy with the {service} they completed",
  "they handled our {service} start to finish with no problems",
  "the {service} exceeded what we expected",
  "clean, careful work on our {service}",
  "our {service} went off without a hitch",
  "very pleased with the service on our {service}",
  "they made time for our {service} when we needed it",
  "easy booking and great work on our {service}",
  "grateful for the help with our {service}",
];

export const plumbingLeadConnectors = ["Also,", "Honestly,", "To be fair,", "Oh and", "On top of that,", "Plus,", "The best part is that", "What stood out is that"];
export const plumbingFuseConnectors = ["plus", "and honestly", "and on top of that", "and also", "and"];

export function buildPlumbingHumanPools(): HumanPools {
  const base = plumbingPools;
  return {
    ...base,
    openings: rework(base.openings, false, true),
    timeliness: rework(base.timeliness, false, false, true),
    workmanship: rework(base.workmanship, true, false, true),
    pricing: rework(base.pricing, true, false, true),
    closings: rework(base.closings, false, false, true),
    oneLiners: [...rework(base.oneLiners, false).filter((e) => !/\bfix/i.test(e)), ...plumbingExtraOneLiners],
    brand: BRAND,
    nickname: "Mr. Drain",
    brandPattern: "mr\\.? drain plumber",
    lowerForm: "mr drain plumber",
    firstForm: "Mr drain plumber",
    backstories: plumbingBackstories,
    personalClosers: plumbingClosers,
    tags: plumbingTags,
    shortTails: plumbingShortTails,
    details: plumbingDetails,
    leadConnectors: plumbingLeadConnectors,
    fuseConnectors: plumbingFuseConnectors,
  };
}
