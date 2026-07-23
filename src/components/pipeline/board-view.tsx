"use client";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/types";
import type { CandidateDto, JobDto } from "@/lib/dto";
import type { MoveStagePayload } from "@/hooks/queries";
import { BoardColumn } from "./board-column";
import { CandidateCard } from "./candidate-card";
import { columnCoordinates } from "./column-coordinates";

export interface BoardViewProps {
  candidates: CandidateDto[];
  jobsById: Record<string, JobDto>;
  canEdit: boolean;
  /** Task-32b's binding Active/Rejected mode — `candidates` already comes filtered to match it (PipelineView), this just tells each column which of its two possible groupings (persisted stage's active occupants vs. persisted stage's rejected-from occupants) to show and whether drag/drop applies at all. */
  mode: "active" | "rejected";
  onOpen: (id: string) => void;
  onMove: (payload: MoveStagePayload) => void;
}

export function BoardView({ candidates, jobsById, canEdit, mode, onOpen, onMove }: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates })
  );
  // Rejected candidates keep the `stage` they were rejected from (the API
  // never clears it — see applyStageMove/useMoveStage) — Rejected mode
  // groups by that same persisted stage, just filtering for `rejected: true`
  // instead of `false`. `candidates` is already server-filtered to one mode
  // or the other (PipelineView's `useCandidates({ rejected })`), so this
  // second check is a defensive no-op in the steady state, not a re-filter.
  const byStage = (stage: Stage) => candidates.filter((c) => c.stage === stage && c.rejected === (mode === "rejected"));
  const active = candidates.find((c) => c.id === activeId) ?? null;
  const name = (id: string | number) => candidates.find((c) => c.id === id)?.name ?? "Candidate";
  const col = (id: string | number | undefined) => (id && STAGE_LABELS[id as Stage]) || "the board";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press space or enter to pick up a candidate. Use left and right arrow keys to choose a stage, then space or enter to drop, or escape to cancel. You can also use the card menu to move without dragging.",
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${name(active.id)} is over the ${col(over.id)} column.` : undefined),
          onDragEnd: ({ active, over }) =>
            over ? `${name(active.id)} dropped into ${col(over.id)}.` : `${name(active.id)} was dropped. No change.`,
          onDragCancel: ({ active }) => `Dragging ${name(active.id)} was cancelled.`,
        },
      }}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={(e: DragEndEvent) => {
        setActiveId(null);
        const targetStage = e.over?.id as Stage | undefined;
        const candidate = candidates.find((c) => c.id === e.active.id);
        if (targetStage && candidate && candidate.stage !== targetStage) {
          onMove({ candidateId: candidate.id, stage: targetStage });
        }
      }}
    >
      <ol className="flex gap-4 overflow-x-auto snap-x snap-mandatory md:snap-none pb-4" aria-label="Pipeline stages">
        {STAGES.map((stage) => (
          <BoardColumn key={stage} stage={stage} candidates={byStage(stage)}
            jobsById={jobsById} canEdit={canEdit} mode={mode} onOpen={onOpen} onMove={onMove} />
        ))}
      </ol>
      <DragOverlay>{active ? <CandidateCard candidate={active} jobsById={jobsById} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
