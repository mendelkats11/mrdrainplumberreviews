import Link from "next/link";
import { reviewAreas } from "@/lib/review-areas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-text-muted">Mr. Drain Plumber</p>
        <h1 className="mt-2 font-semibold text-2xl">Leave us a review</h1>
        <p className="mt-2 text-text-muted">
          Each service area has its own QR code linking directly to its page below.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {reviewAreas.map((a) => (
          <li key={a.slug}>
            <Link href={`/${a.slug}`} className="text-brass hover:text-brass-dim">
              {a.name} →
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
