"use client";

import { formatRelative } from "@/lib/format";
import type { CandidateDto } from "@/lib/dto";
import { useUiStore } from "@/stores/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconArrowRight,
  IconChat,
  IconClock,
  IconDoc,
  IconInbox,
  IconStarFilled,
  IconUser,
  type IconProps,
} from "@/components/ui/icons";

interface FlatActivity {
  key: string;
  candidateId: string;
  candidateName: string;
  actorName: string;
  type: string;
  meta: string;
  createdAt: string;
}

/** Every candidate's `activity` entries, newest first, capped to `limit`. */
function flattenActivity(candidates: CandidateDto[], limit: number): FlatActivity[] {
  const all: FlatActivity[] = candidates.flatMap((c) =>
    c.activity.map((a, i) => ({
      key: `${c.id}-${i}-${a.createdAt}`,
      candidateId: c.id,
      candidateName: c.name,
      actorName: a.actorName,
      type: a.type,
      meta: a.meta,
      createdAt: a.createdAt,
    }))
  );
  return all
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

const ACTIVITY_ICON: Record<string, (props: IconProps) => React.JSX.Element> = {
  created: IconUser,
  "stage-moved": IconArrowRight,
  "rating-changed": IconStarFilled,
  "note-added": IconChat,
  "resume-parsed": IconDoc,
};

/**
 * Turns a raw `{ type, meta }` activity entry into a verb + optional detail
 * clause. Entries whose `meta` would just restate the verb (e.g.
 * resume-parsed's "resume text attached") omit the detail rather than
 * repeat themselves; entries whose `meta` carries real information (a stage
 * transition, a rating change, which job a candidate was added to) keep it.
 */
function describeActivity(type: string, meta: string): { verb: string; detail?: string } {
  if (type === "stage-moved") {
    if (meta === "rejected") return { verb: "rejected" };
    if (meta === "restored") return { verb: "restored" };
    return { verb: "moved", detail: meta };
  }
  if (type === "rating-changed") return { verb: "rated", detail: meta };
  if (type === "created") return { verb: "created a profile for", detail: meta };
  if (type === "note-added") return { verb: "left a note for" };
  if (type === "resume-parsed") return { verb: "attached a resume for" };
  return { verb: "updated" };
}

export interface ActivityFeedProps {
  candidates: CandidateDto[];
  limit?: number;
}

/** Workspace-wide activity, flattened across every candidate and sorted newest first. Row click opens that candidate's drawer. */
export function ActivityFeed({ candidates, limit = 10 }: ActivityFeedProps) {
  const openDrawer = useUiStore((s) => s.openDrawer);
  const items = flattenActivity(candidates, limit);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconInbox size={18} />}
        title="No activity yet"
        body="Actions on candidates — stage moves, notes, ratings — will show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const Icon = ACTIVITY_ICON[item.type] ?? IconClock;
        const { verb, detail } = describeActivity(item.type, item.meta);
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => openDrawer(item.candidateId)}
              className="flex w-full items-start gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-text-3">
                <Icon size={14} />
              </span>
              <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span className="min-w-0 truncate text-sm text-text-2">
                  <span className="font-medium text-text">{item.actorName}</span> {verb}{" "}
                  <span className="font-medium text-text">{item.candidateName}</span>
                  {detail && <span className="text-text-3"> · {detail}</span>}
                </span>
                <span className="shrink-0 text-xs text-text-3">· {formatRelative(item.createdAt)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Same row footprint as `ActivityFeed` so the feed panel never reflows once data arrives. */
export function ActivityFeedSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-start gap-3 p-2.5">
          <Skeleton circle width={28} height={28} />
          <div className="flex-1 pt-1">
            <Skeleton width={`${70 - i * 4}%`} height={13} />
          </div>
        </li>
      ))}
    </ul>
  );
}
