import type { Metadata } from "next";

// Rendered when asked for, never at build time. Every admin page reads the database and the signed in session, and a
// deploy must not wait on either: when the database was slow, admin pages ran past the 60 second build limit and failed it.
export const dynamic = "force-dynamic";

// The admin is private. It is also blocked in robots.txt, but a blocked page can still be listed by address, so it says so itself.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
