export interface ReviewArea {
  slug: string;
  name: string;
  // PLACEHOLDER — replace with https://www.google.com/maps/place/?q=place_id:YOUR_PLACE_ID
  // once available. Deliberately not a g.page/search.google.com link — those
  // resolve to search.google.com, which mobile OSes hand off to the Google
  // Search app or plain browser, not Maps. The google.com/maps/place/ format
  // is reliably recognized as a Maps-app Universal/App Link on both iOS and
  // Android — it lands on the business's place page rather than the review
  // box directly, one extra tap to "write a review" from there, but it
  // actually opens the app instead of staying in-browser.
  googleReviewUrl: string;
}

// Each area is an independent entry — editing one's name/link doesn't
// touch the others. Replace the slug/name/googleReviewUrl per area once
// the real service-area list and Google links are ready.
export const reviewAreas: ReviewArea[] = [
  { slug: "mission", name: "Mission", googleReviewUrl: "https://www.google.com/maps/place/?q=place_id:ChIJ9X6O1USTnUQRE4PkkJhY-7Q" },
  { slug: "white-rock", name: "White Rock", googleReviewUrl: "https://www.google.com/maps/place/?q=place_id:ChIJp-vcSn938ooRWPXqTWMRJDc" },
  { slug: "port-moody", name: "Port Moody", googleReviewUrl: "https://www.google.com/maps/place/?q=place_id:ChIJJfuZFbmReicRyt1msBGUdOQ" },
  { slug: "pitt-meadows", name: "Pitt Meadows", googleReviewUrl: "https://www.google.com/maps/place/?q=place_id:ChIJL7a_gVGbjkERQjHM7GEQqSY" },
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
