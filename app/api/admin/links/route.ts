import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sameOrigin, verifySessionToken } from "@/lib/admin-auth";
import { getAllAreaLinks, setAreaUrl, validateLinkUrl } from "@/lib/area-links";
import { getReviewAreaBySlug } from "@/lib/review-areas";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return unauthorized();
  return NextResponse.json({ ok: true, links: await getAllAreaLinks() });
}

// Body: { slug, url }. An empty url resets that area to its default link.
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req.headers.get("origin"), req.headers.get("host"))) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return unauthorized();

  const rawBody = await req.text().catch(() => "");
  if (rawBody.length > 2048) {
    return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  }
  let body: { slug?: unknown; url?: unknown } | null = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }

  const slug = body?.slug;
  if (typeof slug !== "string" || !getReviewAreaBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Unknown area." }, { status: 400 });
  }

  if (typeof body?.url === "string" && body.url.trim() === "") {
    await setAreaUrl(slug, null);
    return NextResponse.json({ ok: true, reset: true });
  }

  const check = validateLinkUrl(body?.url);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
  }
  await setAreaUrl(slug, check.url);
  return NextResponse.json({ ok: true, url: check.url });
}
