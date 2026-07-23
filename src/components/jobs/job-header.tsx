"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError } from "@/lib/api-client";
import { useCan } from "@/hooks/use-can";
import { useJob, useJobs, useUpdateJob } from "@/hooks/queries";
import { EMPLOYMENT_TYPE_LABELS, STAGES, STAGE_LABELS } from "@/lib/types";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { IconArrowRight, IconX } from "@/components/ui/icons";
import { DeleteJobDialog, JobStatusBadge } from "./job-card";
import { JobFormDialog } from "./job-form-dialog";

/** Reads a server-thrown ApiClientError's message, falling back to a generic one for network/parse failures. */
function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

function JobHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton width={92} height={13} />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-2">
          <Skeleton width={240} height={24} />
          <Skeleton width={300} height={15} />
        </div>
        <Skeleton width={220} height={32} />
      </div>
      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <Skeleton key={stage} height={56} />
        ))}
      </div>
    </div>
  );
}

export interface JobHeaderProps {
  jobId: string;
}

/**
 * `/jobs/[jobId]` header: back link, title + meta + status, gated
 * Edit/Close-Reopen/Delete actions, and a 5-stage count strip. Task 24
 * mounts `<PipelineView jobId={jobId} />` directly below this component —
 * see the seam comment in `app/(app)/jobs/[jobId]/page.tsx`.
 *
 * Stage counts come from `useJobs()` (the list query), not `useJob(jobId)`
 * — only the list endpoint's aggregation populates `counts`, and it's kept
 * fresh by `useMoveStage`'s `["jobs"]` invalidation on every pipeline move
 * (see src/hooks/queries.ts). Both queries share one cache, so this is a
 * cheap read of data the app already has rather than a second network
 * round-trip.
 */
export function JobHeader({ jobId }: JobHeaderProps) {
  const jobQuery = useJob(jobId);
  const jobsQuery = useJobs();
  const { canEdit } = useCan();
  const router = useRouter();
  const updateJob = useUpdateJob(jobId);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (jobQuery.isError) {
    const notFound = jobQuery.error instanceof ApiClientError && jobQuery.error.status === 404;
    return (
      <EmptyState
        icon={<IconX size={18} />}
        title={notFound ? "Job not found" : "Couldn't load this job"}
        body={notFound ? "It may have been deleted." : "Something went wrong. Try again."}
        action={
          notFound ? (
            <Link href="/jobs" className={buttonClasses("secondary")}>
              Back to jobs
            </Link>
          ) : (
            <Button onClick={() => jobQuery.refetch()}>Try again</Button>
          )
        }
        className="py-24"
      />
    );
  }

  if (jobQuery.isLoading || !jobQuery.data) {
    return <JobHeaderSkeleton />;
  }

  const job = jobQuery.data;
  const counts = jobsQuery.data?.find((j) => j.id === jobId)?.counts;

  function toggleStatus() {
    const next = job.status === "open" ? "closed" : "open";
    updateJob.mutate(
      { status: next },
      {
        onError: (err) => {
          toast({ title: "Couldn't update job", description: serverMessage(err), variant: "error" });
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/jobs"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-text-2 transition-colors hover:text-text focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <IconArrowRight size={14} className="rotate-180" />
        Back to jobs
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-text">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1.5 text-sm text-text-3">
            {job.department} · {job.location} · {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
          </p>
        </div>

        {canEdit && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleStatus} loading={updateJob.isPending}>
              {job.status === "open" ? "Close role" : "Reopen role"}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-center">
            <p className="text-lg font-semibold tabular-nums" style={{ color: `var(--stage-${stage}-fg)` }}>
              {counts?.[stage] ?? 0}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-text-3">{STAGE_LABELS[stage]}</p>
          </div>
        ))}
      </div>

      {canEdit && (
        <>
          <JobFormDialog open={formOpen} onOpenChange={setFormOpen} job={job} />
          <DeleteJobDialog
            job={job}
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            onDeleted={() => router.push("/jobs")}
          />
        </>
      )}
    </div>
  );
}
