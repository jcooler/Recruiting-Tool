"use client";

import { useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { CandidateDto, JobDto } from "@/lib/dto";
import { SOURCE_LABELS, STAGES, STAGE_LABELS } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StageBadge } from "@/components/ui/stage-badge";
import { IconChevronDown, IconSearch, IconStarFilled } from "@/components/ui/icons";

const MAX_VISIBLE_TAGS = 2;
const ROW_HEIGHT = 56;
const OVERSCAN = 10;

// Explicit per-column pixel widths, read by <colgroup> below. `table-fixed`
// layout takes its column widths from the first row it sees — normally the
// header row — but here the header is the *only* row still in normal flow
// (each body <tr> is `position: absolute`, so it's out of flow and can't
// contribute to the fixed layout's width calculation). A shared <colgroup>
// is what keeps header and (virtualized, absolutely-positioned) body cells
// aligned to the same columns.
const COLUMN_WIDTHS: Record<string, number> = {
  name: 240,
  job: 200,
  stage: 140,
  rating: 110,
  tags: 220,
  source: 140,
  updated: 120,
};
const TABLE_MIN_WIDTH = Object.values(COLUMN_WIDTHS).reduce((sum, w) => sum + w, 0);

export interface TableViewProps {
  candidates: CandidateDto[];
  jobsById: Record<string, JobDto>;
  onOpen: (id: string) => void;
  /**
   * Not part of the brief's core 3-prop signature — added so the empty state
   * below can actually clear the filters it names. PipelineView owns
   * search/job/rejected (shared with BoardView, per the brief); TableView
   * only adds client-side sorting, so it has no state of its own to reset.
   */
  onClearFilters?: () => void;
}

function ariaSortValue(direction: false | "asc" | "desc"): "ascending" | "descending" | "none" {
  if (direction === "asc") return "ascending";
  if (direction === "desc") return "descending";
  return "none";
}

/** Sort direction glyph. Always visible (not hover-only) so keyboard and touch users get the same affordance as mouse users. */
function SortArrow({ direction }: { direction: false | "asc" | "desc" }) {
  return (
    <IconChevronDown
      size={13}
      className={cn(
        "shrink-0 transition-transform",
        direction === "asc" && "rotate-180",
        direction === "desc" && "rotate-0",
        direction === false && "opacity-40"
      )}
    />
  );
}

const columnHelper = createColumnHelper<CandidateDto>();

/**
 * Virtualized, sortable candidate table — the other half of Task 25's
 * board/table toggle. Renders a real `<table>`/`<thead>`/`<tbody>`/`<tr>`/
 * `<td>` tree (not `role="table"` divs) so screen readers get table
 * semantics for free; only the body rows are windowed via
 * `@tanstack/react-virtual`, positioned absolutely inside a `<tbody>` sized
 * to the full (unwindowed) row count so the scrollbar reflects the real
 * data length.
 *
 * Filtering (search/job/rejected) is owned by PipelineView and already
 * baked into `candidates` — this component adds only client-side sorting
 * (`getSortedRowModel`), never re-filters.
 */
export function TableView({ candidates, jobsById, onOpen, onClearFilters }: TableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const columns = [
    columnHelper.accessor("name", {
      id: "name",
      header: "Name",
      cell: ({ row }) => {
        const candidate = row.original;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar seed={candidate.avatarSeed} name={candidate.name} size={28} />
            <button
              type="button"
              onClick={() => onOpen(candidate.id)}
              className="truncate rounded-sm text-sm font-medium text-text hover:text-accent focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              {candidate.name}
            </button>
          </div>
        );
      },
    }),
    columnHelper.accessor((c) => jobsById[c.jobId]?.title ?? "", {
      id: "job",
      header: "Job",
      cell: ({ getValue }) => <span className="block truncate text-sm text-text-2">{getValue() || "—"}</span>,
    }),
    columnHelper.accessor("stage", {
      id: "stage",
      header: "Stage",
      sortingFn: (a, b) => STAGES.indexOf(a.original.stage) - STAGES.indexOf(b.original.stage),
      cell: ({ row }) => <StageBadge stage={row.original.stage} rejected={row.original.rejected} />,
    }),
    columnHelper.accessor("rating", {
      id: "rating",
      header: "Rating",
      cell: ({ getValue }) => {
        const rating = getValue();
        return (
          <span className="inline-flex items-center gap-1 text-sm text-text-2">
            <IconStarFilled size={12} className="text-accent" />
            <span aria-hidden="true">{rating}/5</span>
            <span className="sr-only">rated {rating} of 5</span>
          </span>
        );
      },
    }),
    columnHelper.accessor((c) => c.tags.length, {
      id: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (tags.length === 0) return <span className="text-sm text-text-3">—</span>;
        const visible = tags.slice(0, MAX_VISIBLE_TAGS);
        const overflow = tags.length - visible.length;
        return (
          <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
            {visible.map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))}
            {overflow > 0 && <Badge variant="neutral">+{overflow}</Badge>}
          </div>
        );
      },
    }),
    columnHelper.accessor((c) => SOURCE_LABELS[c.source] ?? c.source, {
      id: "source",
      header: "Source",
      cell: ({ getValue }) => <span className="text-sm text-text-2">{getValue()}</span>,
    }),
    columnHelper.accessor("updatedAt", {
      id: "updated",
      header: "Updated",
      cell: ({ getValue }) => <span className="text-sm text-text-3">{formatRelative(getValue())}</span>,
    }),
  ];

  const table = useReactTable({
    data: candidates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconSearch size={18} />}
        title="No candidates match these filters"
        body="Try a different search term or clear the filters above."
        action={<Button onClick={onClearFilters}>Clear filters</Button>}
        className="py-24"
      />
    );
  }

  return (
    <div ref={scrollRef} className="overflow-auto rounded-lg border border-border" style={{ maxHeight: "calc(100vh - 280px)" }}>
      <table className="w-full table-fixed border-collapse text-left" style={{ minWidth: TABLE_MIN_WIDTH }}>
        <caption className="sr-only">Candidates — sortable table</caption>
        <colgroup>
          {table.getAllLeafColumns().map((column) => (
            <col key={column.id} style={{ width: COLUMN_WIDTHS[column.id] }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-border">
            {table.getFlatHeaders().map((header) => (
              <th key={header.id} scope="col" aria-sort={ariaSortValue(header.column.getIsSorted())} className="bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-3">
                <button
                  type="button"
                  onClick={header.column.getToggleSortingHandler()}
                  className="inline-flex items-center gap-1 rounded-sm hover:text-text focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <SortArrow direction={header.column.getIsSorted()} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                className="h-14 border-b border-border transition-colors hover:bg-surface-2"
                style={{ position: "absolute", transform: `translateY(${virtualRow.start}px)`, width: "100%" }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="overflow-hidden px-3 align-middle"
                    // Stage only: verified live that Chromium computes *no*
                    // accessible name at all for a <td> whose subtree
                    // contains an aria-hidden <svg> icon next to text (the
                    // icon appears to short-circuit the cell's name-from-
                    // content walk rather than being cleanly skipped — an
                    // isolated repro confirmed this is specific to the
                    // icon+text-in-a-generic-span shape, not e.g. headings
                    // or buttons). Every other column here is icon-free
                    // text/chips, which compute their cell name from content
                    // correctly on their own. An explicit `aria-label`
                    // sources the Stage cell's name directly and sidesteps
                    // that computation.
                    aria-label={
                      cell.column.id === "stage"
                        ? row.original.rejected
                          ? "Rejected"
                          : STAGE_LABELS[row.original.stage]
                        : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
