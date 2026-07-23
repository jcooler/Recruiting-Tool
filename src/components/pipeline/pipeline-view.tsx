"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useCandidates, useJobs, useMoveStage } from "@/hooks/queries";
import { useDebounced } from "@/hooks/use-debounced";
import { useUiStore } from "@/stores/ui";
import type { JobDto } from "@/lib/dto";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/field";
import { IconPlus, IconSearch, IconX } from "@/components/ui/icons";
import { BoardSkeleton } from "./board-skeleton";
import { BoardView } from "./board-view";

const SEARCH_DEBOUNCE_MS = 250;

export interface PipelineViewProps {
  /** Present on the embedded `/jobs/[jobId]` board — scopes the query and hides the job filter. Absent on `/candidates`. */
  jobId?: string;
}

/**
 * Owns the pipeline's filter state (search, job, rejected) and renders
 * `BoardSkeleton` / an error retry state / `BoardView` off one
 * `useCandidates` query. Wrapped in `Suspense` because `useSearchParams`
 * requires one for any statically-analyzable route segment — the fallback
 * matches `BoardView`'s own loading skeleton so there's no visible flash.
 */
export function PipelineView({ jobId }: PipelineViewProps) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <PipelineViewInner jobId={jobId} />
    </Suspense>
  );
}

function PipelineViewInner({ jobId }: PipelineViewProps) {
  const { canEdit } = useCan();
  const searchParams = useSearchParams();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const setAddCandidateOpen = useUiStore((s) => s.setAddCandidateOpen);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const [filterJobId, setFilterJobId] = useState("");
  const [showRejected, setShowRejected] = useState(false);

  const jobsQuery = useJobs();
  const jobsById = useMemo(() => {
    const map: Record<string, JobDto> = {};
    for (const job of jobsQuery.data ?? []) map[job.id] = job;
    return map;
  }, [jobsQuery.data]);

  const effectiveJobId = jobId ?? (filterJobId || undefined);
  const candidatesQuery = useCandidates({
    jobId: effectiveJobId,
    search: debouncedSearch || undefined,
    rejected: showRejected,
  });
  const moveStage = useMoveStage();

  // ?candidate=<id> opens the drawer on load (e.g. a shared/bookmarked link).
  // Closing it and keeping the URL in sync is Task 26's job (CandidateDrawer).
  useEffect(() => {
    const candidateId = searchParams.get("candidate");
    if (candidateId) openDrawer(candidateId);
  }, [searchParams, openDrawer]);

  if (candidatesQuery.isError) {
    return (
      <EmptyState
        icon={<IconX size={18} />}
        title="Couldn't load candidates"
        body="Something went wrong fetching the pipeline."
        action={<Button onClick={() => candidatesQuery.refetch()}>Try again</Button>}
        className="py-24"
      />
    );
  }

  const isLoading = candidatesQuery.isLoading || !candidatesQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {!jobId && (
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text">Candidates</h1>
            {!isLoading && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-text-3">
                {candidatesQuery.data.length}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
            <Input
              type="search"
              aria-label="Search candidates"
              placeholder="Search candidates"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {!jobId && (
            <div className="w-full sm:w-48">
              <NativeSelect
                aria-label="Filter by job"
                value={filterJobId}
                onChange={(e) => setFilterJobId(e.target.value)}
              >
                <option value="">All jobs</option>
                {(jobsQuery.data ?? []).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <button
            type="button"
            aria-pressed={showRejected}
            onClick={() => setShowRejected((r) => !r)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
              showRejected
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-text-2 hover:bg-surface-2"
            )}
          >
            Show rejected
          </button>

          {/* Task 25 seam: board/table view toggle mounts here. */}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {canEdit && (
              <Button onClick={() => setAddCandidateOpen(true)}>
                <IconPlus size={15} />
                Add candidate
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <BoardView
          candidates={candidatesQuery.data}
          jobsById={jobsById}
          canEdit={canEdit}
          onOpen={openDrawer}
          onMove={moveStage.mutate}
        />
      )}
    </div>
  );
}
