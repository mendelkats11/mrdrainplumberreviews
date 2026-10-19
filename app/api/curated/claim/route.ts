import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sameOrigin, verifySessionToken } from "@/lib/admin-auth";
import { getReviewAreaBySlug } from "@/lib/review-areas";
import { claimReview, hasCuratedPool } from "@/lib/curated-reviews";
import { createRateLimiter } from "@/lib/rate-limit";

// Called when a visitor copies a review. This is the moment it is taken out
// of the pool; if someone else copied it first, ok comes back false and the
// page quietly shows another one.
const limited = createRateLimiter(60_000, 30);
const MAX_BODY_BYTES = 1024;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "bad origin" }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ ok: false, error: "too many requests" }, { status: 429 });
  }

  const rawBody = await req.text().catch(() => "");
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload too large" }, { status: 413 });
  }
  let body: { area?: unknown; id?: unknown; test?: unknown } | null = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const area = typeof body?.area === "string" ? getReviewAreaBySlug(body.area) : undefined;
  const id = body?.id;
  if (!area || !(area.kind === "renovation" || hasCuratedPool(area)) || typeof id !== "string" || !/^[a-z]+-\d{1,6}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  // Test mode (admin only) lets the owner try Copy without using up a
  // review. It is honored only with a valid admin session.
  if (body?.test === true && verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: true, test: true });
  }

  const result = await claimReview(area, id);
  return NextResponse.json({ ok: result.ok });
}
