"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAnalytics, useCandidates } from "@/hooks/queries";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { IconBriefcase, IconChat, IconCheck, IconUser, IconX } from "@/components/ui/icons";
import { KpiTile, KpiTileSkeleton } from "./kpi-tile";
import { ActivityFeed, ActivityFeedSkeleton } from "./activity-feed";

// Small enough to still register as "some" on a tall bar, but never invisible
// for a single-digit count sitting next to a much larger stage.
const STAGE_BAR_MIN_PCT = 4;

interface StageCount {
  stage: Stage;
  count: number;
}

/**
 * Labelled proportional bars, one per pipeline stage — current headcount,
 * not the funnel's "ever reached this stage" total. Deliberately not a
 * chart: no axes, no legend, just label + tinted bar + count, scaled
 * against the largest stage so relative size is legible at a glance. Each
 * row carries its own `aria-label` (the visible label/bar/count triplet is
 * `aria-hidden`) so a screen reader announces "Interview: 12 candidates"
 * once instead of three disconnected fragments.
 */
function StageOverview({ counts }: { counts: StageCount[] }) {
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold text-text">Stage overview</h2>
      <div className="mt-4 flex flex-col gap-3.5">
        {counts.map(({ stage, count }) => {
          const pct = count === 0 ? 0 : Math.max((count / max) * 100, STAGE_BAR_MIN_PCT);
          return (
            <div
              key={stage}
              role="img"
              aria-label={`${STAGE_LABELS[stage]}: ${count} candidate${count === 1 ? "" : "s"}`}
              className="flex items-center gap-3"
            >
              <span aria-hidden="true" className="w-20 shrink-0 truncate text-sm text-text-2">
                {STAGE_LABELS[stage]}
              </span>
              <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, backgroundColor: `var(--stage-${stage}-fg)` }}
                />
              </span>
              <span aria-hidden="true" className="w-7 shrink-0 text-right text-sm font-medium tabular-nums text-text">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Same row footprint as `StageOverview` so the panel never reflows once data arrives. */
function StageOverviewSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton width={110} height={15} />
      <div className="mt-4 flex flex-col gap-3.5">
        {STAGES.map((stage) => (
          <div key={stage} className="flex items-center gap-3">
            <Skeleton width={72} height={13} />
            <div className="flex-1">
              <Skeleton height={8} />
            </div>
            <Skeleton width={20} height={13} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The `/dashboard` landing screen: four KPI tiles, the stage-overview bar
 * strip, and the workspace activity feed. All three data sources
 * (`useAnalytics`, `useCandidates({})`, `useCandidates({ rejected: true })`)
 * are fetched once here and threaded down, so the KPI row, stage bars, and
 * activity feed all read from the same in-flight/error/success state rather
 * than each managing their own.
 */
export function DashboardView() {
  const analytics = useAnalytics();
  // Non-rejected candidates: source for the KPI tiles and the stage-overview
  // bars (both are about the live, active pipeline).
  const candidates = useCandidates({});
  // Rejected candidates: `GET /api/candidates` defaults to `rejected: false`
  // when the filter is omitted, so without this second query a rejected
  // candidate's activity — including the "rejected" stage-moved event
  // itself — would silently never reach the feed. KPIs/stage bars must NOT
  // read from this query; only the activity feed merges it in.
  const rejectedCandidates = useCandidates({ rejected: true });

  const stageCounts = useMemo<StageCount[]>(() => {
    const data = candidates.data ?? [];
    // `candidates` is already the non-rejected query, so `!c.rejected` is
    // redundant today — kept as a defensive guard in case this ever reads
    // from a broader list.
    return STAGES.map((stage) => ({
      stage,
      count: data.filter((c) => c.stage === stage && !c.rejected).length,
    }));
  }, [candidates.data]);

  const interviewCount = stageCounts.find((s) => s.stage === "interview")?.count ?? 0;

  const feedCandidates = useMemo(
    () => [...(candidates.data ?? []), ...(rejectedCandidates.data ?? [])],
    [candidates.data, rejectedCandidates.data]
  );

  const isLoading = analytics.isLoading || candidates.isLoading || rejectedCandidates.isLoading;
  const isError = analytics.isError || candidates.isError || rejectedCandidates.isError;

  function retry() {
    analytics.refetch();
    candidates.refetch();
    rejectedCandidates.refetch();
  }

  if (isError) {
    return (
      <EmptyState
        icon={<IconX size={18} />}
        title="Couldn't load the dashboard"
        body="Something went wrong fetching your workspace data."
        action={<Button onClick={retry}>Try again</Button>}
        className="py-24"
      />
    );
  }

  if (isLoading || !analytics.data || !candidates.data || !rejectedCandidates.data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <KpiTileSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <StageOverviewSkeleton />
          <div className="rounded-lg border border-border bg-surface p-5">
            <Skeleton width={110} height={15} />
            <div className="mt-2">
              <ActivityFeedSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { totals } = analytics.data;
  const isEmptyWorkspace = totals.candidates === 0 && totals.openJobs === 0;

  if (isEmptyWorkspace) {
    return (
      <EmptyState
        icon={<IconBriefcase size={18} />}
        title="Create your first job"
        body="Once you've posted a role, candidates and pipeline activity will show up here."
        action={
          <Link href="/jobs" className={buttonClasses("primary")}>
            Create your first job
          </Link>
        }
        className="py-24"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Open roles" value={totals.openJobs} icon={IconBriefcase} />
        <KpiTile label="Active candidates" value={totals.active} icon={IconUser} />
        <KpiTile label="In interview" value={interviewCount} icon={IconChat} />
        <KpiTile label="Hired" value={totals.hired} icon={IconCheck} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <StageOverview counts={stageCounts} />
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-text">Recent activity</h2>
          <div className="mt-2">
            <ActivityFeed candidates={feedCandidates} />
          </div>
        </div>
      </div>
    </div>
  );
}
