import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { getReviewAreaBySlug, reviewAreas } from "@/lib/review-areas";
import ReviewGenerator from "@/components/ReviewGenerator";
import CuratedReview from "@/components/CuratedReview";
import { hasCuratedPool } from "@/lib/curated-reviews";
import { getAreaUrl } from "@/lib/area-links";

// Rendered per request (not at build time) so a link edited in /admin
// takes effect immediately, instead of being frozen into the build. It
// also stops Hostinger's CDN from caching a stale copy of the page.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return reviewAreas.map((a) => ({ area: a.slug }));
}

// Each business gets its own tab title instead of always saying Mr. Drain
// Plumber.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const reviewArea = getReviewAreaBySlug((await params).area);
  return {
    title: `Leave a Review | ${reviewArea?.kind === "renovation" ? reviewArea.name : "Mr. Drain Plumber"}`,
  };
}

export default async function ReviewAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ area: string }>;
  searchParams: Promise<{ test?: string | string[] }>;
}) {
  const { area } = await params;
  const reviewArea = getReviewAreaBySlug(area);
  if (!reviewArea) notFound();
  const googleReviewUrl = (await getAreaUrl(reviewArea.slug)) ?? reviewArea.googleReviewUrl;

  // ?test=1 only does anything for a logged-in admin: Copy then works
  // normally but isn't recorded, so testing doesn't use up real reviews.
  // For everyone else the parameter is ignored.
  const { test } = await searchParams;
  const isAdmin = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  const testMode = isAdmin && test === "1";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {testMode && (
        <p
          role="status"
          className="rounded-full border border-brass px-4 py-1.5 text-sm text-brass"
        >
          Test mode: copying here isn&apos;t recorded and won&apos;t use up any reviews.
        </p>
      )}
      {reviewArea.kind === "plumbing" ? (
        <>
          <div>
            <p className="text-sm uppercase tracking-wide text-text-muted">Mr. Drain Plumber</p>
            <h1 className="mt-2 font-semibold text-2xl">
              How did we do in {reviewArea.name}?
            </h1>
            <p className="mt-2 max-w-md text-text-muted">
              Feel free to use this as a starting point, edit it however you like, or
              write your own. Copy it, then leave it on Google.
            </p>
          </div>

          {hasCuratedPool(reviewArea) ? (
            // Owner-approved reviews, used up when copied.
            <CuratedReview
              areaSlug={reviewArea.slug}
              googleReviewUrl={googleReviewUrl}
              testMode={testMode}
            />
          ) : (
            <ReviewGenerator
              areaSlug={reviewArea.slug}
              areaName={reviewArea.name}
              googleReviewUrl={googleReviewUrl}
              testMode={testMode}
            />
          )}
        </>
      ) : (
        // Renovation businesses only offer reviews the owner has approved
        // (content/approved-reviews.json). Copying one uses it up.
        <>
          <div>
            <p className="max-w-md text-sm uppercase tracking-wide text-text-muted">
              {reviewArea.name}
            </p>
            <h1 className="mt-2 font-semibold text-2xl">How did we do?</h1>
            <p className="mt-2 max-w-md text-text-muted">
              Feel free to use this as a starting point, edit it however you like, or
              write your own. Copy it, then leave it on Google.
            </p>
          </div>

          <CuratedReview
            areaSlug={reviewArea.slug}
            googleReviewUrl={googleReviewUrl}
            testMode={testMode}
          />
        </>
      )}
    </main>
  );
}
