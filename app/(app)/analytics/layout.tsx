import type { ReactNode } from "react";
import type { Metadata } from "next";

// `page.tsx` under this segment is a Client Component (required for its
// `next/dynamic(..., { ssr: false })` import — see the comment there), and
// Client Components can't export `metadata`. This sibling Server Component
// layout carries the page title instead, same idiom as every other
// top-level route (compare `app/(app)/dashboard/page.tsx`'s `{ title:
// "Dashboard" }`) — the root layout's `title.template` turns this into
// "Analytics · ApplicantWizard".
export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return children;
}
