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
import { IconBoard, IconPlus, IconSearch, IconTable, IconX } from "@/components/ui/icons";
import { BoardSkeleton } from "./board-skeleton";
import { BoardView } from "./board-view";
import { TableView } from "./table-view";

const SEARCH_DEBOUNCE_MS = 250;

export interface PipelineViewProps {
  /** Present on the embedded `/jobs/[jobId]` board — scopes the query and hides the job filter. Absent on `/candidates`. */
  jobId?: string;
}

/**
 * Owns the pipeline's filter state (search, job, mode) and renders
 * `BoardSkeleton` / an error retry state / `BoardView` off one
 * `useCandidates` query. `mode` ("active" | "rejected") is the binding
 * two-state design from task-32b: it drives `useCandidates`'s `rejected`
 * filter directly (the API itself stays either/or — never both at once),
 * and is threaded down to `BoardView`/`TableView` so they can render each
 * mode correctly (board: which stage-column a card lands in, draggability;
 * table: empty-state copy — the Stage cell itself already reads each row's
 * own `rejected` field). Wrapped in `Suspense` because `useSearchParams`
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
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const [filterJobId, setFilterJobId] = useState("");
  const [mode, setMode] = useState<"active" | "rejected">("active");

  function clearFilters() {
    setSearch("");
    setFilterJobId("");
    setMode("active");
  }

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
    rejected: mode === "rejected",
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

          <div role="group" aria-label="Mode" className="inline-flex shrink-0 overflow-hidden rounded-md border border-border">
            <button
              type="button"
              aria-pressed={mode === "active"}
              onClick={() => setMode("active")}
              className={cn(
                "inline-flex h-9 items-center px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                mode === "active" ? "bg-accent-soft text-accent" : "bg-surface text-text-2 hover:bg-surface-2"
              )}
            >
              Active
            </button>
            <button
              type="button"
              aria-pressed={mode === "rejected"}
              onClick={() => setMode("rejected")}
              className={cn(
                "inline-flex h-9 items-center border-l border-border px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                mode === "rejected" ? "bg-accent-soft text-accent" : "bg-surface text-text-2 hover:bg-surface-2"
              )}
            >
              Rejected
            </button>
          </div>

          <div role="group" aria-label="View" className="inline-flex shrink-0 overflow-hidden rounded-md border border-border">
            <button
              type="button"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                view === "board" ? "bg-accent-soft text-accent" : "bg-surface text-text-2 hover:bg-surface-2"
              )}
            >
              <IconBoard size={15} />
              Board
            </button>
            <button
              type="button"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 border-l border-border px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                view === "table" ? "bg-accent-soft text-accent" : "bg-surface text-text-2 hover:bg-surface-2"
              )}
            >
              <IconTable size={15} />
              Table
            </button>
          </div>

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
      ) : view === "table" ? (
        <TableView
          candidates={candidatesQuery.data}
          jobsById={jobsById}
          onOpen={openDrawer}
          onClearFilters={clearFilters}
          mode={mode}
        />
      ) : (
        <BoardView
          candidates={candidatesQuery.data}
          jobsById={jobsById}
          canEdit={canEdit}
          mode={mode}
          onOpen={openDrawer}
          onMove={moveStage.mutate}
        />
      )}
    </div>
  );
}
