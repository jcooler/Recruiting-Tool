import { KpiTileSkeleton } from "@/components/dashboard/kpi-tile";
import { Skeleton } from "@/components/ui/skeleton";

/** One 2x2-grid card's loading shape: title + takeaway lines above a plot-sized block. */
function ChartCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton width={140} height={15} />
      <div className="mt-1.5">
        <Skeleton width={200} height={12} />
      </div>
      <div className="mt-4">
        <Skeleton height={260} />
      </div>
    </div>
  );
}

/**
 * Loading shape for `/analytics`: the KPI row + 2x2 chart grid `AnalyticsView`
 * renders once its data (and, on first visit, the Recharts chunk itself) has
 * loaded. Used both as `next/dynamic`'s `loading` fallback in
 * `app/(app)/analytics/page.tsx` (while the chart chunk downloads) and by
 * `AnalyticsView` itself while `useAnalytics()` is in flight, so the page
 * never jumps between "fetching the code" and "fetching the data."
 */
export function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <KpiTileSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <ChartCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
