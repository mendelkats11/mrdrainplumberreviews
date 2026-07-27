export interface ReviewArea {
  slug: string;
  name: string;
  // PLACEHOLDER — replace with:
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
export const reviewAreas: ReviewArea[] = [
  { slug: "mission", name: "Mission", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJ9X6O1USTnUQRE4PkkJhY-7Q" },
  { slug: "white-rock", name: "White Rock", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJp-vcSn938ooRWPXqTWMRJDc" },
  { slug: "port-moody", name: "Port Moody", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJJfuZFbmReicRyt1msBGUdOQ" },
  { slug: "pitt-meadows", name: "Pitt Meadows", googleReviewUrl: "https://www.google.com/maps/search/?api=1&query=Mr.+Drain+Plumber&query_place_id=ChIJL7a_gVGbjkERQjHM7GEQqSY" },
  { slug: "stonebridge", name: "Stonebridge", googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER" },
  { slug: "college-park", name: "College Park", googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER" },
  { slug: "brighton", name: "Brighton", googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER" },
  { slug: "rosewood", name: "Rosewood", googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER" },
  { slug: "martensville", name: "Martensville", googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER" },
  { slug: "warman", name: "Warman", googleReviewUrl: "https://search.google.com/local/writereview?placeid=PLACEHOLDER" },
];

export function getReviewAreaBySlug(slug: string) {
  return reviewAreas.find((a) => a.slug === slug);
}
