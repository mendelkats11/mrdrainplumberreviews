import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leave a Review | Mr. Drain Plumber",
  description: "Scan, get a suggested review, leave it on Google.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
