export interface ReviewArea {
  slug: string;
  // What the page and the admin screen call it: the area for a plumbing
  // page ("Mission"), the full Google listing name for the others.
  name: string;
  // Groups pages in the admin screen — one group per business.
  business: string;
  // Which review-text set a page uses. Only "plumbing" has phrase pools
  // today; "renovation" pages have none yet (each business is getting its
  // own), so they just send visitors to the Google profile.
  kind: "plumbing" | "renovation";
  // Renovation pages only: which business's phrase pools to use, and the
  // city for the location mention.
  brand?: "renomake" | "remodela" | "forge";
  city?: string;
  // Empty until a link is set in the admin screen; the page then simply
  // hides its Google button. Format, once known:
  // https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=YOUR_PLACE_ID
  // This is Google's documented cross-platform Maps URL format. Deliberately
  // NOT `?q=place_id:...` — that's a web-only shorthand the native Maps
  // app's deep-link parser doesn't understand; it just echoes the raw
  // string as a literal text search instead of resolving the place. And
  // deliberately not a g.page/search.google.com link either — those
  // resolve to search.google.com, which mobile OSes hand off to the
  // Google Search app or plain browser, not Maps. The api=1 + query +
  // query_place_id combination is what actually opens the Maps app at the
  // right business (one extra tap to "write a review" from the place page,
  // but it opens the app instead of staying in-browser).
  googleReviewUrl: string;
}

// Each area is an independent entry — editing one's name/link doesn't
// touch the others. Replace the slug/name/googleReviewUrl per area once
// the real service-area list and Google links are ready.
type AreaSeed = Pick<ReviewArea, "slug" | "name" | "googleReviewUrl">;

const plumbingAreas: AreaSeed[] = [
  { slug: "mission", name: "Mission", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJ9X6O1USTnUQRE4PkkJhY-7Q" },
  { slug: "white-rock", name: "White Rock", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJp-vcSn938ooRWPXqTWMRJDc" },
  { slug: "port-moody", name: "Port Moody", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJJfuZFbmReicRyt1msBGUdOQ" },
  { slug: "pitt-meadows", name: "Pitt Meadows", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJL7a_gVGbjkERQjHM7GEQqSY" },
  { slug: "stonebridge", name: "Stonebridge", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber+of+Stonebridge+Saskatoon&query_place_id=ChIJkSaQ037xBFMRi9m4SJXEscs" },
  { slug: "college-park", name: "College Park", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber+of+College+Park+Saskatoon&query_place_id=ChIJk4CEWGPzBFMRQcUnhykcgI8" },
  { slug: "brighton", name: "Brighton", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber+of+Brighton+Saskatoon&query_place_id=ChIJmay3E_DzBFMRPfVAd4VDneM" },
  { slug: "rosewood", name: "Rosewood", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber+of+Rosewood+Saskatoon&query_place_id=ChIJIdLDOqjzBFMRagEjXg6gw3s" },
  { slug: "martensville", name: "Martensville", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber+of+Martensville&query_place_id=ChIJ4ytmnLFdBFMR2G-dPK8W6Gs" },
  { slug: "warman", name: "Warman", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber+of+Warman&query_place_id=ChIJV5mPCWtdBFMRCwOBSczldnM" },
];

// The renovation businesses: three brands, each with a separate Google
// Business Profile per city. `listing` is the profile's exact Google name.
// Links start empty and are set from the admin screen.
const renovationBrands: {
  key: "renomake" | "remodela" | "forge";
  business: string;
  cities: string[];
}[] = [
  {
    key: "renomake",
    business: "RenoMake Kitchen Renovations and Bathroom Remodeling",
    cities: ["Mississauga", "Oakville", "Vaughan"],
  },
  {
    key: "remodela",
    business: "Remodela House Renovations and Kitchen Remodeling",
    cities: ["Mississauga", "Oakville", "North York"],
  },
  {
    key: "forge",
    business: "FORGE Renovations and Construction",
    cities: ["Mississauga", "Vaughan", "North York"],
  },
];

const renovationAreas: ReviewArea[] = renovationBrands.flatMap((brand) =>
  brand.cities.map((city) => ({
    slug: `${brand.key}-${city.toLowerCase().replace(/\s+/g, "-")}`,
    name: `${brand.business} of ${city}`,
    business: brand.business,
    kind: "renovation" as const,
    brand: brand.key,
    city,
    googleReviewUrl: "",
  })),
);

export const reviewAreas: ReviewArea[] = [
  ...plumbingAreas.map((a) => ({
    ...a,
    business: "Mr. Drain Plumber",
    kind: "plumbing" as const,
  })),
  ...renovationAreas,
];

export function getReviewAreaBySlug(slug: string) {
  return reviewAreas.find((a) => a.slug === slug);
}
