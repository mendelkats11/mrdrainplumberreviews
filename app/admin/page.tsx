import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminLinks from "@/components/AdminLinks";
import AdminLogin from "@/components/AdminLogin";
import { SESSION_COOKIE, adminEnabled, verifySessionToken } from "@/lib/admin-auth";
import { getAllAreaLinks } from "@/lib/area-links";
import { hasCuratedPool, remainingFor } from "@/lib/curated-reviews";
import { reviewAreas } from "@/lib/review-areas";

// Depends on the login cookie, so it must render per request, never be
// frozen at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Mr. Drain Plumber",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const enabled = adminEnabled();
  const loggedIn = enabled && verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  const rows = loggedIn ? await getAllAreaLinks() : [];
  const left: Record<string, number> = {};
  if (loggedIn) {
    for (const a of reviewAreas) {
      if (a.kind === "renovation" || hasCuratedPool(a)) left[a.slug] = await remainingFor(a);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-16">
      <h1 className="font-semibold text-2xl">Review links</h1>
      {!enabled ? (
        <p className="max-w-sm text-center text-text-muted">
          Admin login isn&apos;t set up on this server yet. Set the ADMIN_PASSWORD environment
          variable (at least 10 characters) and redeploy.
        </p>
      ) : loggedIn ? (
        <AdminLinks rows={rows} left={left} />
      ) : (
        <AdminLogin />
      )}
    </main>
  );
}
