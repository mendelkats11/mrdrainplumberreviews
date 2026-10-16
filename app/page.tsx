import { notFound } from "next/navigation";

// The site root deliberately shows "not found". It used to list every
// area page, which let anyone who visited the bare domain browse them
// all. Now a page is only reachable by someone holding its specific
// link (the QR code); the full list lives behind the admin login.
export default function Home() {
  notFound();
}
