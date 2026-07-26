import { notFound } from "next/navigation";
import { getReviewAreaBySlug, reviewAreas } from "@/lib/review-areas";
import ReviewGenerator from "@/components/ReviewGenerator";

export function generateStaticParams() {
  return reviewAreas.map((a) => ({ area: a.slug }));
}

export default async function ReviewAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const reviewArea = getReviewAreaBySlug(area);
  if (!reviewArea) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
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

      <ReviewGenerator areaSlug={reviewArea.slug} googleReviewUrl={reviewArea.googleReviewUrl} />
    </main>
  );
}
