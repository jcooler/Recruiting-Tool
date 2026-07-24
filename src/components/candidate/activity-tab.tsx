import type { CandidateDto } from "@/lib/dto";
import { formatRelative } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
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
import { describeActivity } from "./activity-text";

const ACTIVITY_ICON: Record<string, (props: IconProps) => React.JSX.Element> = {
  created: IconUser,
  "stage-moved": IconArrowRight,
  "rating-changed": IconStarFilled,
  "note-added": IconChat,
  "resume-parsed": IconDoc,
};

export interface ActivityTabProps {
  activity: CandidateDto["activity"];
}

/**
 * `<ol>` timeline of this candidate's own activity, newest first — a
 * per-candidate slice of the same log `src/components/dashboard/activity-feed.tsx`
 * flattens across every candidate. `describeActivity` (see `./activity-text`)
 * turns each entry's `{ type, meta }` into the verb + detail text rendered
 * here.
 */
export function ActivityTab({ activity }: ActivityTabProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        icon={<IconInbox size={18} />}
        title="No activity yet"
        body="Stage moves, notes, and rating changes will show up here."
      />
    );
  }

  const sorted = [...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <ol className="relative flex flex-col border-l border-border">
      {sorted.map((entry, i) => {
        const Icon = ACTIVITY_ICON[entry.type] ?? IconClock;
        const { verb, detail } = describeActivity(entry.type, entry.meta);
        return (
          <li key={`${entry.createdAt}-${entry.type}-${i}`} className="relative pb-5 pl-8 last:pb-0">
            <span className="absolute -left-3 top-0 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-surface-2 text-text-3">
              <Icon size={12} />
            </span>
            <p className="text-sm text-text-2">
              <span className="font-medium text-text">{entry.actorName}</span> {verb}
              {detail && <span className="text-text-3"> {detail}</span>}
            </p>
            <p className="mt-0.5 text-xs text-text-3">{formatRelative(entry.createdAt)}</p>
          </li>
        );
      })}
    </ol>
  );
}
