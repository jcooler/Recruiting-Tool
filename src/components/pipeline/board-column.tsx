"use client";

import { useDroppable } from "@dnd-kit/core";
import type { MoveStagePayload } from "@/hooks/queries";
import type { CandidateDto, JobDto } from "@/lib/dto";
import { STAGE_LABELS, type Stage } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconChat, IconDoc, IconFilter, IconInbox, type IconProps } from "@/components/ui/icons";
import { CandidateCard } from "./candidate-card";

// Mirrors StageBadge's own icon map (src/components/ui/stage-badge.tsx) —
// that map is a local const there, not exported, so it's repeated here
// rather than reaching into an unrelated file's internals.
const STAGE_ICON: Record<Stage, (props: IconProps) => React.JSX.Element> = {
  applied: IconInbox,
  screening: IconFilter,
  interview: IconChat,
  offer: IconDoc,
  hired: IconCheck,
};

export interface BoardColumnProps {
  stage: Stage;
  candidates: CandidateDto[];
  jobsById: Record<string, JobDto>;
  canEdit: boolean;
  mode: "active" | "rejected";
  onOpen: (id: string) => void;
  onMove: (payload: MoveStagePayload) => void;
}

/**
 * One pipeline-stage lane. The droppable zone is the card list itself (not
 * the `<li>`, which only carries the column's layout/snap-scroll sizing) so
 * the "isOver" ring highlight wraps exactly the area a dragged card can land
 * in.
 *
 * The `<li>` is a flex column and the droppable div is `flex-1`: BoardView's
 * `<ol>` is a flex row with the (unset, default) `items-stretch`, so every
 * `<li>` already matches the tallest column's height — without `flex-1` the
 * droppable div itself would still only be as tall as its own cards, leaving
 * a column with few candidates a much shorter *droppable rect* than a
 * column with many. That mattered for real: `closestCorners` (BoardView's
 * `collisionDetection`) averages **paired** corner-to-corner distances, so
 * with uneven droppable heights a card near the top of the tallest column
 * could read as "closest" to a short, distant column purely because their
 * bottom corners happened to align — verified live, a single ArrowRight
 * from Applied (19 cards) landed the drop in Offer (5 cards), skipping
 * Screening and Interview entirely. Equal-height droppables remove the
 * height term from that average almost entirely, leaving left/right
 * (column order) as the deciding factor, which is what arrow-key stepping
 * and mouse dropping both need.
 */
export function BoardColumn({ stage, candidates, jobsById, canEdit, mode, onOpen, onMove }: BoardColumnProps) {
  // Rejected mode has no draggable cards anywhere on the board (see
  // CandidateCard), so nothing can ever land here — disabling the droppable
  // outright (rather than leaving it enabled-but-unused) keeps `isOver`
  // from ever lighting the accent ring for a drop that can't happen.
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: !canEdit || mode === "rejected" });
  const Icon = STAGE_ICON[stage];

  return (
    <li className="flex snap-center w-[82vw] sm:w-72 shrink-0 flex-col">
      <h2
        className="mb-3 flex items-center gap-2 text-sm font-semibold"
        style={{ color: `var(--stage-${stage}-fg)` }}
      >
        <Icon size={14} />
        {STAGE_LABELS[stage]}
        <Badge variant="neutral">{candidates.length}</Badge>
      </h2>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-28 flex-1 flex-col gap-2 rounded-lg transition-shadow",
          isOver && "ring-2 ring-accent ring-offset-2 ring-offset-bg"
        )}
      >
        {candidates.length === 0 ? (
          mode === "rejected" ? (
            // No dashed border, no "drop" copy: rejected mode has nothing
            // draggable to drop here (see the useDroppable disable above).
            <div aria-hidden="true" className="flex h-28 items-center justify-center rounded-lg text-xs text-text-3">
              No rejected candidates
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="flex h-28 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-text-3"
            >
              Drop candidates here
            </div>
          )
        ) : (
          candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              jobsById={jobsById}
              canEdit={canEdit}
              onOpen={onOpen}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </li>
  );
}
