"use client";

// No `export const metadata` here (unlike the other top-level pages): Next.js
// requires `ssr: false` on `next/dynamic` to live in a Client Component — pairing
// it with a page-level `metadata` export (Server Component-only) throws a build
// error ("`ssr: false` is not allowed with `next/dynamic` in Server Components").
// Recharts must never enter the shared/server bundle (the whole point of this
// route), so the dynamic import wins; the browser tab falls back to the root
// layout's default title on this one route.
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/analytics/chart-skeleton";

const AnalyticsView = dynamic(() => import("@/components/analytics/analytics-view"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
