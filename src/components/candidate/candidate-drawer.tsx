"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCan } from "@/hooks/use-can";
import { useCandidate, useDeleteCandidate, useJob, useMoveStage, useSetRating } from "@/hooks/queries";
import { useUiStore } from "@/stores/ui";
import { ApiClientError } from "@/lib/api-client";
import type { CandidateDto } from "@/lib/dto";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { NativeSelect } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/ui/stage-badge";
import { StarRating } from "@/components/ui/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { IconBriefcase, IconDots } from "@/components/ui/icons";
import { ActivityTab } from "./activity-tab";
import { EditCandidateDialog } from "./edit-candidate-dialog";
import { NotesTab } from "./notes-tab";
import { ProfileTab } from "./profile-tab";
import { ResumeTab } from "./resume-tab";

function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

/** Mirrors the loaded drawer's header + tabs layout so nothing reflows once data arrives. */
function CandidateDrawerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <Skeleton circle width={48} height={48} />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton width={160} height={18} />
          <Skeleton width={220} height={14} />
          <Skeleton width={120} height={14} />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton width={140} height={36} />
        <Skeleton width={110} height={36} />
      </div>
      <div className="flex gap-5 border-b border-border pb-2">
        {["Profile", "Resume", "Notes", "Activity"].map((tab) => (
          <Skeleton key={tab} width={56} height={16} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton height={13} />
        <Skeleton height={13} width="85%" />
        <Skeleton height={13} width="65%" />
      </div>
    </div>
  );
}

interface DeleteCandidateDialogProps {
  candidate: CandidateDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  /** See `Dialog`'s doc comment — the drawer's dropdown-trigger ref, so focus restores there instead of `<body>` after this dropdown-launched dialog closes. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

/** Confirm-delete dialog for the header's overflow menu — the drawer's only consumer, so it stays private to this file. */
function DeleteCandidateDialog({ candidate, open, onOpenChange, onDeleted, restoreFocusRef }: DeleteCandidateDialogProps) {
  const deleteCandidate = useDeleteCandidate();

  async function handleDelete() {
    try {
      await deleteCandidate.mutateAsync(candidate.id);
      toast({ title: "Candidate deleted", description: `"${candidate.name}" was removed.`, variant: "success" });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast({ title: "Couldn't delete candidate", description: serverMessage(err), variant: "error" });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      restoreFocusRef={restoreFocusRef}
      title="Delete this candidate?"
      description={`This permanently deletes "${candidate.name}" and their history. This can't be undone.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={deleteCandidate.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteCandidate.isPending}>
            Delete candidate
          </Button>
        </>
      }
    />
  );
}

/**
 * Candidate profile drawer, mounted once by `AppShell` and driven entirely
 * by `useUiStore().drawerCandidateId` — every board card / table row /
 * dashboard feed row that calls `openDrawer(id)` renders here, regardless of
 * which page they're on.
 *
 * Wrapped in `Suspense` because the URL-sync effect below needs
 * `useSearchParams`, which requires a Suspense boundary for any
 * statically-analyzable route segment (same reason `PipelineView` wraps
 * itself — see that component's doc comment). The fallback is `null`: with
 * the store's initial `drawerCandidateId` at `null`, there is nothing to
 * show until the boundary resolves, which is effectively immediate on the
 * client.
 */
export function CandidateDrawer() {
  return (
    <Suspense fallback={null}>
      <CandidateDrawerInner />
    </Suspense>
  );
}

function CandidateDrawerInner() {
  const drawerCandidateId = useUiStore((s) => s.drawerCandidateId);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canEdit } = useCan();

  const open = drawerCandidateId !== null;
  const id = drawerCandidateId ?? "";

  const candidateQuery = useCandidate(id);
  const candidate = candidateQuery.data;
  const jobQuery = useJob(candidate?.jobId ?? "");
  const moveStage = useMoveStage();
  const setRating = useSetRating(id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const suppressMenuAutoFocus = useRef(false);
  // The overflow-menu trigger, passed to both Edit and Delete's dialogs as
  // `restoreFocusRef` — see `Dialog`'s doc comment.
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  // Write side of the `?candidate=` URL sync — PipelineView's effect owns
  // the read side (URL -> store, on mount/navigation). Keeping the two
  // one-directional avoids a feedback loop: this effect only fires when
  // `drawerCandidateId` itself changes, and setting the *same* id it already
  // reflects in the URL is a no-op (`current !== drawerCandidateId` guards
  // it), so PipelineView re-opening the same candidate after this effect's
  // own `router.replace` doesn't bounce back here.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get("candidate");
    if (drawerCandidateId && current !== drawerCandidateId) {
      params.set("candidate", drawerCandidateId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else if (!drawerCandidateId && current) {
      params.delete("candidate");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [drawerCandidateId, pathname, router, searchParams]);

  // A candidate deleted by someone else while the drawer is open (or open
  // via a stale/bookmarked `?candidate=` link): bounce out with a toast
  // instead of showing a dead loading skeleton forever. Guarded by a ref
  // (not just `isError`) so this fires once per candidate id, not once per
  // render while the disabled query's error state lingers after close.
  const notFoundHandledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const is404 = candidateQuery.isError && candidateQuery.error instanceof ApiClientError && candidateQuery.error.status === 404;
    if (is404 && notFoundHandledFor.current !== id) {
      notFoundHandledFor.current = id;
      toast({ title: "Candidate not found", description: "It may have been deleted.", variant: "error" });
      closeDrawer();
    }
  }, [open, id, candidateQuery.isError, candidateQuery.error, closeDrawer]);

  function handleOpenChange(next: boolean) {
    if (!next) closeDrawer();
  }

  const job = jobQuery.data;

  return (
    <>
      <Drawer open={open} onOpenChange={handleOpenChange} title={candidate?.name ?? "Candidate"}>
        {candidate ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 border-b border-border pb-5">
              <div className="flex items-start gap-3">
                <Avatar seed={candidate.avatarSeed} name={candidate.name} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-text">{candidate.name}</h2>
                    <StageBadge stage={candidate.stage} rejected={candidate.rejected} />
                  </div>
                  <p className="mt-1 truncate text-sm text-text-2">
                    <a href={`mailto:${candidate.email}`} className="hover:text-accent hover:underline">
                      {candidate.email}
                    </a>
                    {candidate.phone && <> · {candidate.phone}</>}
                    {candidate.location && <> · {candidate.location}</>}
                  </p>
                  {job && (
                    <Link
                      href={`/jobs/${job.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-sm text-text-3 hover:text-accent"
                    >
                      <IconBriefcase size={13} />
                      {job.title}
                    </Link>
                  )}
                </div>

                {canEdit && (
                  <Dropdown>
                    <DropdownTrigger asChild>
                      <button
                        ref={menuTriggerRef}
                        type="button"
                        aria-label={`Actions for ${candidate.name}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </DropdownItem>
                      <DropdownItem
                        destructive={!candidate.rejected}
                        onSelect={() => moveStage.mutate({ candidateId: candidate.id, rejected: !candidate.rejected })}
                      >
                        {candidate.rejected ? "Restore" : "Reject"}
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        destructive
                        onSelect={() => {
                          suppressMenuAutoFocus.current = true;
                          setDeleteOpen(true);
                        }}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownContent>
                  </Dropdown>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {canEdit && (
                  <div className="w-40">
                    <NativeSelect
                      aria-label="Stage"
                      value={candidate.stage}
                      disabled={moveStage.isPending}
                      onChange={(e) => moveStage.mutate({ candidateId: candidate.id, stage: e.target.value as Stage })}
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {STAGE_LABELS[stage]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
                <StarRating
                  value={candidate.rating}
                  onChange={(n) =>
                    setRating.mutate(
                      { rating: n },
                      {
                        onError: (err) => {
                          toast({ title: "Couldn't update rating", description: serverMessage(err), variant: "error" });
                        },
                      }
                    )
                  }
                />
              </div>
            </div>

            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
              <TabsContent value="profile">
                <ProfileTab candidate={candidate} />
              </TabsContent>
              <TabsContent value="resume">
                <ResumeTab resume={candidate.resume} />
              </TabsContent>
              <TabsContent value="notes">
                <NotesTab candidateId={candidate.id} notes={candidate.notes} />
              </TabsContent>
              <TabsContent value="activity">
                <ActivityTab activity={candidate.activity} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <CandidateDrawerSkeleton />
        )}
      </Drawer>

      {candidate && canEdit && (
        <>
          <EditCandidateDialog
            candidate={candidate}
            open={editOpen}
            onOpenChange={setEditOpen}
            restoreFocusRef={menuTriggerRef}
          />
          <DeleteCandidateDialog
            candidate={candidate}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={closeDrawer}
            restoreFocusRef={menuTriggerRef}
          />
        </>
      )}
    </>
  );
}
