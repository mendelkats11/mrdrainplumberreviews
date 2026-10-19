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
  // Renovation pages only: a second, random address for the same page
  // (review.mrdrainplumber.site/ followed by this), the one printed in the
  // QR codes. It does nothing until it is switched on (see
  // LIVE_SECRET_ADDRESSES); the normal address above always works.
  secretSlug?: string;
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
  { slug: "stonebridge", name: "Stonebridge", googleReviewUrl: "https://maps.app.goo.gl/QyhdvAvejfxxQfeBA" },
  { slug: "college-park", name: "College Park", googleReviewUrl: "https://maps.app.goo.gl/6UnZKgrWtkChJXQd6" },
  { slug: "brighton", name: "Brighton", googleReviewUrl: "https://maps.app.goo.gl/szPEKBenLXVBuzUcA" },
  { slug: "rosewood", name: "Rosewood", googleReviewUrl: "https://maps.app.goo.gl/mY3ucMtMcrjv74QG8" },
  { slug: "martensville", name: "Martensville", googleReviewUrl: "https://maps.app.goo.gl/EGLtWVEDHSn9LSzNA" },
  { slug: "warman", name: "Warman", googleReviewUrl: "https://maps.app.goo.gl/oBi3A2m5j5e7nFY89" },
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

// The random addresses are fixed here because the QR codes are printed with
// them; they must not change. Keyed by the page's normal address.
const SECRET_ADDRESSES: Record<string, string> = {
  "renomake-mississauga": "2ceedpqra2z7at",
  "renomake-oakville": "6kdnkr7hr66rsz",
  "renomake-vaughan": "99apt6pu3s292k",
  "remodela-mississauga": "9egy8j7knupmn4",
  "remodela-oakville": "upc4pe6uevx2xf",
  "remodela-north-york": "6tvu56gptfyaas",
  "forge-mississauga": "bhxdaddkvjtv7d",
  "forge-vaughan": "nu2ydfh92be4bz",
  "forge-north-york": "pt6asr4rmtc7ac"
};

// Which random addresses are switched on: a page's normal address, or "*" for
// all nine. Empty means none are, so a scan of a printed code finds nothing.
const LIVE_SECRET_ADDRESSES: string[] = [];

// Google review links for the renovation pages, keyed by the page's normal
// address. Kept here, in the code, so a redeploy can never lose them; a page
// not listed has no link yet (set one in the admin screen, or add it here).
const RENOVATION_GOOGLE_LINKS: Record<string, string> = {
  "renomake-mississauga": "https://maps.app.goo.gl/Z1nfhaKG9cT1de3x7",
  "remodela-oakville": "https://maps.app.goo.gl/bQshVE88AornADNd9",
  "forge-vaughan": "https://maps.app.goo.gl/FguEps2dioxGmg4M9",
  "forge-north-york": "https://maps.app.goo.gl/M7VPv1esG7UZqshSA",
};

const renovationAreas: ReviewArea[] = renovationBrands.flatMap((brand) =>
  brand.cities.map((city) => ({
    slug: `${brand.key}-${city.toLowerCase().replace(/\s+/g, "-")}`,
    secretSlug: SECRET_ADDRESSES[`${brand.key}-${city.toLowerCase().replace(/\s+/g, "-")}`],
    name: `${brand.business} of ${city}`,
    business: brand.business,
    kind: "renovation" as const,
    brand: brand.key,
    city,
    googleReviewUrl: RENOVATION_GOOGLE_LINKS[`${brand.key}-${city.toLowerCase().replace(/\s+/g, "-")}`] ?? "",
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

// Finds the page for an address typed or scanned in the browser: the normal
// address always, the random one only once it has been switched on.
export function getReviewAreaByAddress(address: string): { area: ReviewArea; viaSecret: boolean; secretIsLive: boolean } | undefined {
  const normal = reviewAreas.find((a) => a.slug === address);
  if (normal) return { area: normal, viaSecret: false, secretIsLive: true };
  const secret = reviewAreas.find((a) => a.secretSlug === address);
  if (!secret) return undefined;
  const live = LIVE_SECRET_ADDRESSES.includes("*") || LIVE_SECRET_ADDRESSES.includes(secret.slug);
  return { area: secret, viaSecret: true, secretIsLive: live };
}
