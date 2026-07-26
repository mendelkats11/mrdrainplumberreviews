export interface ReviewArea {
  slug: string;
  name: string;
  // PLACEHOLDER — replace with this area's real Google "write a review" link
  // once available (Google Business Profile > Ask for reviews > copy link,
  // or https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID).
  googleReviewUrl: string;
}

// Each area is an independent entry — editing one's name/link doesn't
// touch the others. Replace the slug/name/googleReviewUrl per area once
// the real service-area list and Google links are ready.
export const reviewAreas: ReviewArea[] = [
  { slug: "mission", name: "Mission", googleReviewUrl: "https://g.page/r/CROD5JCYWPu0EBM/review" },
  { slug: "white-rock", name: "White Rock", googleReviewUrl: "https://g.page/r/CVj16k1jESQ3EBM/review" },
  { slug: "port-moody", name: "Port Moody", googleReviewUrl: "https://g.page/r/CcrdZrARlHTkEBM/review" },
  { slug: "pitt-meadows", name: "Pitt Meadows", googleReviewUrl: "https://g.page/r/CUIxzOxhEKkmEBM/review" },
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
