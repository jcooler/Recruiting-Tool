// Pure mapping from a candidate activity entry's `{ type, meta }` to display
// text for `activity-tab.tsx`'s timeline. Split out — JSX-free, like
// `src/components/pipeline/column-coordinates.ts` — so this logic is unit
// testable directly: `activity-tab.tsx` itself contains JSX, and Vitest's
// plain esbuild transform can't parse that under this repo's
// `"jsx": "preserve"` tsconfig (see `src/components/ui/toast.tsx`'s
// identical constraint).
//
// `meta` already carries the full detail string for entries that need one
// — `"applied → screening"`, `"0 → 3"`, `"added to Backend Engineer"` — see
// the `activityEntry(...)` call sites under `app/api/candidates/**`.
// Entries whose `meta` would just restate the verb (`"resume text
// attached"`, `"profile updated"`, or the empty string logged for notes)
// drop it rather than repeat themselves — mirrors the equivalent mapping in
// `src/components/dashboard/activity-feed.tsx`, tuned for this tab's
// single-candidate context (no "for <candidate name>" clause needed here).

export interface ActivityDescription {
  verb: string;
  detail?: string;
}

export function describeActivity(type: string, meta: string): ActivityDescription {
  switch (type) {
    case "stage-moved":
      if (meta === "rejected") return { verb: "rejected this candidate" };
      if (meta === "restored") return { verb: "restored this candidate" };
      return { verb: "moved", detail: meta };
    case "rating-changed":
      return { verb: "rated", detail: meta };
    case "created":
      return { verb: "created this profile", detail: meta };
    case "note-added":
      return { verb: "added a note" };
    case "resume-parsed":
      return { verb: "attached a resume" };
    case "updated":
      return { verb: "updated the profile" };
    default:
      return { verb: "updated the profile" };
  }
}
