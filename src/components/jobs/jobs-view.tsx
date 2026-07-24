"use client";

import { useRef, useState } from "react";
import { useCan } from "@/hooks/use-can";
import { useJobs } from "@/hooks/queries";
import type { JobDto } from "@/lib/dto";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBriefcase, IconPlus, IconX } from "@/components/ui/icons";
import { JobCard, JobCardSkeleton } from "./job-card";
import { JobFormDialog } from "./job-form-dialog";

const SKELETON_COUNT = 6;

/**
 * `/jobs` landing screen: a header row (title, live count, gated "New job"
 * action) over a responsive grid of `JobCard`s. Create and edit share one
 * `JobFormDialog` instance — `editingJob` set means edit mode, `undefined`
 * means create — so opening either never mounts a second dialog.
 */
export function JobsView() {
  const { canEdit } = useCan();
  const jobs = useJobs();
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobDto | undefined>(undefined);
  // The specific JobCard's dropdown trigger that launched "Edit" — passed to
  // the one shared JobFormDialog instance as `restoreFocusRef`. See
  // `Dialog`'s doc comment. Cleared on `openCreate` so the "New job" button
  // (a direct click, not dropdown-launched) falls back to Dialog's default
  // `document.activeElement` capture instead of reusing a stale opener from
  // a previous edit.
  const editOpenerRef = useRef<HTMLElement | null>(null);

  function openCreate() {
    editOpenerRef.current = null;
    setEditingJob(undefined);
    setFormOpen(true);
  }

  function openEdit(job: JobDto, opener: HTMLElement | null) {
    editOpenerRef.current = opener;
    setEditingJob(job);
    setFormOpen(true);
  }

  if (jobs.isError) {
    return (
      <EmptyState
        icon={<IconX size={18} />}
        title="Couldn't load jobs"
        body="Something went wrong fetching your open roles."
        action={<Button onClick={() => jobs.refetch()}>Try again</Button>}
        className="py-24"
      />
    );
  }

  const isLoading = jobs.isLoading || !jobs.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-text">Jobs</h1>
          {!isLoading && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium tabular-nums text-text-3">
              {jobs.data.length}
            </span>
          )}
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <IconPlus size={15} />
            New job
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.data.length === 0 ? (
        <EmptyState
          icon={<IconBriefcase size={18} />}
          title="No open roles yet — create your first job"
          body={canEdit ? "Post a role to start tracking candidates against it." : "Once a role is posted, it'll show up here."}
          action={canEdit ? <Button onClick={openCreate}>Create job</Button> : undefined}
          className="py-24"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.data.map((job) => (
            <JobCard key={job.id} job={job} canEdit={canEdit} onEdit={openEdit} />
          ))}
        </div>
      )}

      {canEdit && (
        <JobFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          job={editingJob}
          restoreFocusRef={editOpenerRef}
        />
      )}
    </div>
  );
}
