"use client";

import { useReducedMotion } from "framer-motion";
import { useAnalytics } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChart, IconCheck, IconClock, IconUser, IconX } from "@/components/ui/icons";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ChartSkeleton } from "./chart-skeleton";
import { FunnelChart, SourceChart, TimeInStageChart, VelocityChart } from "./charts";

/**
 * `/analytics`: a KPI row (total / active / hired / rejected candidates)
 * over a 2x2 grid of Recharts charts (funnel, time-in-stage, source mix,
 * velocity). Default-exported (not named, unlike the rest of the app's
 * `*View` components) because `app/(app)/analytics/page.tsx` reaches this
 * module through `next/dynamic(() => import(...))`, which resolves a
 * module's default export — that dynamic import, not a `<script>` tag or an
 * eager import anywhere else, is what keeps Recharts out of every other
 * route's bundle.
 */
export default function AnalyticsView() {
  const analytics = useAnalytics();
  const reduceMotion = useReducedMotion();

  if (analytics.isError) {
    return (
      <EmptyState
        icon={<IconX size={18} />}
        title="Couldn't load analytics"
        body="Something went wrong fetching your workspace data."
        action={<Button onClick={() => analytics.refetch()}>Try again</Button>}
        className="py-24"
      />
    );
  }

  if (analytics.isLoading || !analytics.data) {
    return <ChartSkeleton />;
  }

  const { totals, funnel, timeInStage, bySource, velocity } = analytics.data;

  if (totals.candidates === 0) {
    return (
      <EmptyState
        icon={<IconChart size={18} />}
        title="Analytics unlock once you add candidates"
        body="Once candidates start moving through your pipeline, funnel, timing, source, and velocity charts will show up here."
        className="py-24"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Analytics</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Total candidates" value={totals.candidates} icon={IconUser} />
        <KpiTile label="Active" value={totals.active} icon={IconClock} />
        <KpiTile label="Hired" value={totals.hired} icon={IconCheck} />
        <KpiTile label="Rejected" value={totals.rejected} icon={IconX} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FunnelChart funnel={funnel} reduceMotion={reduceMotion} />
        <TimeInStageChart timeInStage={timeInStage} reduceMotion={reduceMotion} />
        <SourceChart bySource={bySource} reduceMotion={reduceMotion} />
        <VelocityChart velocity={velocity} reduceMotion={reduceMotion} />
      </div>
    </div>
  );
}
