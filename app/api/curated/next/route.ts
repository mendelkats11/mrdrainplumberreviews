import { NextRequest, NextResponse } from "next/server";
import { getReviewAreaBySlug } from "@/lib/review-areas";
import { pickReview } from "@/lib/curated-reviews";
import { createRateLimiter } from "@/lib/rate-limit";

// Hands a visitor one approved review that has not been copied yet.
// Calling this again (Regenerate) never uses anything up.
const limited = createRateLimiter(60_000, 90);

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const slug = req.nextUrl.searchParams.get("area") ?? "";
  const area = getReviewAreaBySlug(slug);
  if (!area || area.kind !== "renovation") {
    return NextResponse.json({ error: "unknown area" }, { status: 404 });
  }

  // Reviews the visitor has just seen, so Regenerate does not loop between two.
  const avoid = (req.nextUrl.searchParams.get("avoid") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z]+-\d{1,6}$/.test(s))
    .slice(0, 20);

  const review = await pickReview(area, avoid);
  return NextResponse.json(
    { review: review ? { id: review.id, text: review.text } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
