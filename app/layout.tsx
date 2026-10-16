import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leave a Review | Mr. Drain Plumber",
  description: "Scan, get a suggested review, leave it on Google.",
  // These pages are only meant for people holding the QR code or link, so
  // keep search engines from listing them.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <footer className="px-4 pb-6 text-center">
          <Link href="/admin" className="text-xs text-text-muted/50 transition hover:text-text-muted">
            Admin
          </Link>
        </footer>
      </body>
    </html>
  );
}
