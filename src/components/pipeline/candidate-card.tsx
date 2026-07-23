"use client";

import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "framer-motion";
import type { MoveStagePayload } from "@/hooks/queries";
import type { CandidateDto, JobDto } from "@/lib/dto";
import { daysSince } from "@/lib/format";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { IconArrowRight, IconClock, IconDots, IconStarFilled } from "@/components/ui/icons";

const MAX_VISIBLE_TAGS = 2;

// Radix's Sub/SubTrigger/SubContent don't have styled wrappers in
// src/components/ui/dropdown.tsx (only Root/Trigger/Content/Item/Separator do)
// — this menu is the first consumer that needs a submenu, so it composes the
// raw primitives directly (dropdown.tsx's own doc comment calls this out as
// supported) and mirrors DropdownContent/DropdownItem's exact classes rather
// than duplicating them into the shared file for a single caller.
const SUB_TRIGGER_CLASS =
  "flex cursor-pointer select-none items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-text outline-none transition-colors " +
  "data-[highlighted]:bg-surface-2 data-[state=open]:bg-surface-2";
const SUB_CONTENT_CLASS =
  "z-50 min-w-[9rem] rounded-md border border-border bg-surface p-1 shadow-lg outline-none " +
  "data-[state=closed]:opacity-0 starting:opacity-0 transition-opacity duration-100";

export interface CandidateCardProps {
  candidate: CandidateDto;
  jobsById: Record<string, JobDto>;
  canEdit?: boolean;
  onOpen?: (id: string) => void;
  onMove?: (payload: MoveStagePayload) => void;
  /** Rendered inside `<DragOverlay>` as the floating clone under the cursor — never draggable/interactive itself. */
  overlay?: boolean;
}

/**
 * One pipeline card — draggable when it represents an active candidate an
 * editor can act on, read-only otherwise (a rejected candidate, in the
 * task-32b Rejected board mode; or any candidate for a read-only/interviewer
 * viewer). The whole card is the drag surface (`useDraggable`'s
 * `listeners`/`attributes` land on the root element, giving it
 * `role="group"` + keyboard support for free — not the hook's default
 * `role="button"`, since this root also contains real `<button>`s; see the
 * `useDraggable` call below) — nested controls (the name button, the actions
 * menu trigger) stop pointerdown propagation so a plain click never gets
 * mistaken for the start of a drag.
 *
 * `onOpen`/`onMove`/`canEdit` are optional only for the `overlay` render path
 * in `BoardView`'s `<DragOverlay>`, which passes just `candidate` + `jobsById`
 * — every other caller (`BoardColumn`) always supplies all three.
 */
export function CandidateCard({
  candidate,
  jobsById,
  canEdit = false,
  onOpen,
  onMove,
  overlay = false,
}: CandidateCardProps) {
  const reduceMotion = useReducedMotion();
  // The `overlay` render path (BoardView's <DragOverlay>) reuses this same
  // component for the floating clone under the cursor. dnd-kit's internal
  // `draggableNodes` registry is a plain Map keyed only by id with no
  // dedup guard (see useDraggable in @dnd-kit/core) — if this instance
  // registered under the *same* id as the real card, its layout-effect
  // would run after the real card's (DragOverlay only mounts once a drag
  // is already active) and silently overwrite that id's registry entry
  // with the overlay's portal node, corrupting collision-detection's rect
  // measurements for the entire rest of the drag. Namespacing the overlay's
  // id keeps its (always-disabled, never-activated) registration fully
  // isolated.
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: overlay ? `${candidate.id}::overlay` : candidate.id,
    disabled: !canEdit || overlay,
    // dnd-kit's default draggable role is "button" (see @dnd-kit/core's
    // useDraggable, defaultRole) — but this card's root also *contains* two
    // real <button>s (the name button below, the Actions menu trigger),
    // and a button-in-a-button is invalid ARIA: axe's `nested-interactive`
    // rule flagged it (verified live on both /candidates and the embedded
    // /jobs/[jobId] board — same shared component, same violation). "group"
    // keeps the root focusable/tabbable (dnd-kit's actual drag behavior is
    // driven by `listeners`, not by `role`, so this doesn't touch pointer or
    // keyboard drag) while correctly allowing focusable descendants; the
    // still-present `aria-roledescription="draggable"` is what tells
    // assistive tech this group is draggable.
    attributes: { role: "group" },
  });

  // stageHistory always has at least one entry once a candidate is created
  // (the create route seeds it with the initial stage) — the createdAt
  // fallback only guards against a malformed/empty array reaching this card.
  const lastStageEntry = candidate.stageHistory[candidate.stageHistory.length - 1];
  const days = daysSince(lastStageEntry?.enteredAt ?? candidate.createdAt);
  const job = jobsById[candidate.jobId];
  const canManage = canEdit && !overlay;

  // Only wire up drag semantics (role="group", tabIndex, aria-describedby,
  // and critically `aria-disabled`) when the card can actually be dragged.
  // Verified live: with `{...attributes}` spread unconditionally, a
  // read-only (interviewer) card's `aria-disabled="true"` on this root
  // computes as an inherited disabled state for the whole accessibility
  // subtree — Chromium's own a11y tree (and Playwright's actionability
  // check, which reads it) treated the nested "open profile" name button
  // as non-operable too, even though nothing in the DOM actually disables
  // it. For a read-only viewer the draggable affordance isn't "temporarily
  // disabled", it's not applicable at all, so the fix is to not present
  // drag semantics rather than present them as disabled. The same reasoning
  // extends to `candidate.rejected` (task-32b's Rejected board mode): a
  // rejected candidate isn't mid-drag-and-eligible-to-move, it's parked
  // outside the active pipeline entirely, so it gets the same "not
  // applicable" treatment rather than a disabled one.
  const draggable = canEdit && !overlay && !candidate.rejected;
  const dragProps = draggable ? { ...listeners, ...attributes } : {};

  return (
    <motion.div
      ref={setNodeRef}
      {...dragProps}
      whileHover={!reduceMotion && draggable && !isDragging ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-colors",
        "hover:border-accent focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        overlay && "shadow-lg"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar seed={candidate.avatarSeed} name={candidate.name} size={28} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onOpen?.(candidate.id)}
                // -my-0.5 py-0.5: grows the click/tap target to the WCAG 2.2
                // 24px minimum (text-sm's line-height alone renders at 20px —
                // axe's target-size rule flagged it) without shifting the job
                // title below it — the negative margin cancels the padding's
                // effect on layout flow, so only the hit area grows.
                className="-my-0.5 min-w-0 flex-1 truncate rounded-sm py-0.5 text-sm font-medium text-text hover:text-accent focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {candidate.name}
              </button>
              {/* Column headers group by persisted stage regardless of mode (see BoardView), so a card sitting under e.g. "Interview" needs its own mark that it's rejected, not currently active in that stage — the mode toggle alone only tells you which board you're looking at, not what any one card under a shared stage heading means. Reuses Badge's `danger` variant, the same already-contrast-checked token pair StageBadge's own `rejected` tone draws from. */}
              {candidate.rejected && (
                <Badge variant="danger" className="shrink-0">
                  Rejected
                </Badge>
              )}
            </div>
            {job && <p className="truncate text-xs text-text-3">{job.title}</p>}
          </div>
        </div>

        {canManage && (
          <Dropdown>
            <DropdownTrigger asChild onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
              <button
                type="button"
                aria-label={`Actions for ${candidate.name}`}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <IconDots size={14} />
              </button>
            </DropdownTrigger>
            <DropdownContent>
              {candidate.rejected ? (
                // Rejected mode (task-32b, binding design): no "Move to"
                // (the card isn't in an active stage to move from), no
                // "Reject" (it already is) — only "Restore", which drops the
                // rejected flag and returns the candidate to Active mode at
                // its still-persisted stage.
                <>
                  <DropdownItem onSelect={() => onMove?.({ candidateId: candidate.id, rejected: false })}>
                    Restore
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onSelect={() => onOpen?.(candidate.id)}>View profile</DropdownItem>
                </>
              ) : (
                <>
                  <RadixDropdown.Sub>
                    <RadixDropdown.SubTrigger className={SUB_TRIGGER_CLASS}>
                      Move to
                      <IconArrowRight size={12} />
                    </RadixDropdown.SubTrigger>
                    <RadixDropdown.Portal>
                      <RadixDropdown.SubContent className={SUB_CONTENT_CLASS} sideOffset={4}>
                        {STAGES.map((stage: Stage) => (
                          <DropdownItem
                            key={stage}
                            disabled={stage === candidate.stage}
                            onSelect={() => onMove?.({ candidateId: candidate.id, stage })}
                          >
                            {STAGE_LABELS[stage]}
                          </DropdownItem>
                        ))}
                      </RadixDropdown.SubContent>
                    </RadixDropdown.Portal>
                  </RadixDropdown.Sub>
                  <DropdownItem destructive onSelect={() => onMove?.({ candidateId: candidate.id, rejected: true })}>
                    Reject
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem onSelect={() => onOpen?.(candidate.id)}>View profile</DropdownItem>
                </>
              )}
            </DropdownContent>
          </Dropdown>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-text-2">
        <IconStarFilled size={12} className="text-accent" />
        {candidate.rating}/5
      </div>

      {candidate.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {candidate.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <Badge key={tag} variant="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-text-3">
        <IconClock size={12} />
        <span aria-hidden="true">{days}d</span>
        <span className="sr-only">
          {days} day{days === 1 ? "" : "s"} in this stage
        </span>
      </div>
    </motion.div>
  );
}
