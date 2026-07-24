"use client";

import Link from "next/link";
import { useRef, useState, type RefObject } from "react";
import { ApiClientError } from "@/lib/api-client";
import type { JobDto } from "@/lib/dto";
import { useDeleteJob, useUpdateJob } from "@/hooks/queries";
import { EMPLOYMENT_TYPE_LABELS, STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { IconCheck, IconDots, IconX } from "@/components/ui/icons";

const ZERO_COUNTS: Record<Stage, number> = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;

/** Reads a server-thrown ApiClientError's message, falling back to a generic one for network/parse failures. */
function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

/**
 * Open/closed indicator, icon + visible text together (never color alone) —
 * shared by the jobs grid and the detail-page header so a job's status
 * reads identically everywhere it appears.
 */
export function JobStatusBadge({ status }: { status: JobDto["status"] }) {
  return status === "open" ? (
    <Badge variant="success">
      <IconCheck size={11} />
      Open
    </Badge>
  ) : (
    <Badge variant="neutral">
      <IconX size={11} />
      Closed
    </Badge>
  );
}

/**
 * Compact per-stage "mini-funnel": one column per pipeline stage, a tiny
 * bar scaled against that job's own busiest stage, the count, and its
 * label — a shape a recruiter can read at a glance across a whole grid of
 * jobs (e.g. "everyone's stuck at screening") without parsing five numbers
 * per card. `counts` is optional because it isn't present on every JobDto
 * (only the list endpoint's aggregation populates it) — missing entirely
 * reads as an all-zero pipeline rather than crashing the card.
 */
function StageFunnel({ counts = ZERO_COUNTS }: { counts?: Record<Stage, number> }) {
  const max = Math.max(1, ...STAGES.map((s) => counts[s] ?? 0));

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {STAGES.map((stage) => {
        const count = counts[stage] ?? 0;
        const pct = count === 0 ? 10 : Math.max((count / max) * 100, 20);
        return (
          <div key={stage} className="flex flex-col items-center gap-1">
            <div className="flex h-8 w-full items-end overflow-hidden rounded-sm bg-surface-2">
              <div
                className="w-full rounded-[1px]"
                style={{
                  height: `${pct}%`,
                  backgroundColor: `var(--stage-${stage}-fg)`,
                  opacity: count === 0 ? 0.3 : 1,
                }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-text">{count}</span>
            <span className="w-full truncate text-center text-[10px] font-medium uppercase tracking-wide text-text-3">
              {STAGE_LABELS[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface DeleteJobDialogProps {
  job: JobDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful delete — e.g. the detail page navigates back to `/jobs`. */
  onDeleted?: () => void;
  /** See `Dialog`'s doc comment — `JobCard` passes its dropdown trigger's ref; `JobHeader`'s direct Delete button omits this and gets the default `document.activeElement` capture. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Confirm-delete dialog shared by `JobCard`'s overflow menu and
 * `JobHeader`'s action row. Deleting a job cascades to every candidate in
 * its pipeline server-side (see `DELETE /api/jobs/[jobId]`) — the copy
 * says so explicitly rather than leaving that as a surprise.
 */
export function DeleteJobDialog({ job, open, onOpenChange, onDeleted, restoreFocusRef }: DeleteJobDialogProps) {
  const deleteJob = useDeleteJob();

  async function handleDelete() {
    try {
      await deleteJob.mutateAsync(job.id);
      toast({
        title: "Job deleted",
        description: `"${job.title}" and its candidates were removed.`,
        variant: "success",
      });
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast({ title: "Couldn't delete job", description: serverMessage(err), variant: "error" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      restoreFocusRef={restoreFocusRef}
      title="Delete this job?"
      description={`This permanently deletes "${job.title}" and every candidate in its pipeline. This can't be undone.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={deleteJob.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteJob.isPending}>
            Delete job
          </Button>
        </>
      }
    />
  );
}

export interface JobCardProps {
  job: JobDto;
  canEdit: boolean;
  /** `opener` is this card's dropdown-trigger button (still-mounted, unlike the menu item that called this) — the caller should forward it as the shared edit dialog's `restoreFocusRef`. See `Dialog`'s doc comment. */
  onEdit: (job: JobDto, opener: HTMLElement | null) => void;
}

/**
 * One job requisition tile in the `/jobs` grid. The clickable link covers
 * the title/meta/status cluster (its accessible name stays a reasonable
 * length); the stage funnel sits below as plain readable content rather
 * than being folded into the link's name. The overflow menu is a sibling
 * of the link, not nested inside it, so activating it never triggers
 * navigation — and it doesn't render at all for read-only roles.
 */
export function JobCard({ job, canEdit, onEdit }: JobCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateJob = useUpdateJob(job.id);
  // Edit/Delete both hand off to a dialog that opens right as this menu
  // closes. Radix DropdownMenu's own close behavior refocuses its trigger
  // by default, which — depending on timing — can steal focus back from
  // the dialog that just opened. Suppress it only for those two items;
  // "Close/Reopen role" opens no dialog, so it keeps the normal
  // refocus-the-trigger behavior a keyboard user expects.
  const suppressMenuAutoFocus = useRef(false);
  // The dropdown trigger itself, passed to Edit/Delete's dialogs as
  // `restoreFocusRef` — see `Dialog`'s doc comment for why this is needed
  // instead of the default `document.activeElement` capture.
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    <div className="relative rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent/50">
      {canEdit && (
        <div className="absolute right-3 top-3">
          <Dropdown>
            <DropdownTrigger asChild>
              <button
                ref={triggerRef}
                type="button"
                aria-label={`Actions for ${job.title}`}
                className="flex size-7 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <IconDots size={16} />
              </button>
            </DropdownTrigger>
            <DropdownContent
              onCloseAutoFocus={(e) => {
                if (suppressMenuAutoFocus.current) {
                  e.preventDefault();
                  suppressMenuAutoFocus.current = false;
                }
              }}
            >
              <DropdownItem
                onSelect={() => {
                  suppressMenuAutoFocus.current = true;
                  onEdit(job, triggerRef.current);
                }}
              >
                Edit
              </DropdownItem>
              <DropdownItem onSelect={toggleStatus}>{job.status === "open" ? "Close role" : "Reopen role"}</DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                destructive
                onSelect={() => {
                  suppressMenuAutoFocus.current = true;
                  setConfirmOpen(true);
                }}
              >
                Delete
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      )}

      <Link
        href={`/jobs/${job.id}`}
        className="group block rounded-md pr-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <h3 className="truncate text-sm font-semibold text-text group-hover:text-accent">{job.title}</h3>
        <p className="mt-1 truncate text-sm text-text-3">
          {job.department} · {job.location} · {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
        </p>
        <div className="mt-3">
          <JobStatusBadge status={job.status} />
        </div>
      </Link>

      <div className="mt-4">
        <StageFunnel counts={job.counts} />
      </div>

      {canEdit && (
        <DeleteJobDialog job={job} open={confirmOpen} onOpenChange={setConfirmOpen} restoreFocusRef={triggerRef} />
      )}
    </div>
  );
}

/** Same footprint as `JobCard` so the grid never reflows once data arrives. */
export function JobCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Skeleton width="55%" height={16} />
      <div className="mt-2">
        <Skeleton width="80%" height={13} />
      </div>
      <div className="mt-3">
        <Skeleton width={62} height={22} borderRadius={999} />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton height={32} width="100%" />
            <Skeleton width={18} height={11} />
          </div>
        ))}
      </div>
    </div>
  );
}
