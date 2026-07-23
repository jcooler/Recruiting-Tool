// Pure decision logic behind `TagInput`'s Enter/comma/blur commit path
// (`./field.tsx`) — split out JSX-free, like `column-coordinates.ts` and
// `activity-text.ts`, so it's unit testable directly: `field.tsx` itself
// contains JSX, and Vitest's plain esbuild transform can't parse that under
// this repo's `"jsx": "preserve"` tsconfig.
//
// Found in task-26 review: `TagInput` had no client-side length enforcement,
// so a user could type and commit a chip longer than the field's zod
// `trimmedString(N)` max (`src/lib/schemas/common.ts`, via
// `createCandidateSchema`'s `skills`/`tags` in `src/lib/schemas/candidate.ts`)
// and get nothing on submit — `zodResolver` blocks it, but the error lands at
// a nested per-item path (`errors.skills[i].message`) that
// `EditCandidateDialog` never reads (it only reads the top-level
// `errors.skills?.message`, which is where an array-length violation like
// `.max(20)` lands, not a per-item one). Rejecting the commit here, with a
// reason the caller can render inline, closes that gap at the source instead
// of teaching the caller to parse react-hook-form's nested error shape.

export interface TagCommitResult {
  /** The new value array to commit, or `null` if nothing should change. */
  next: string[] | null;
  /** True only when `next` is `null` *because* the trimmed draft exceeded `maxItemLength` — the one case `TagInput` shows inline feedback for. An empty or duplicate draft also yields `next: null` but isn't an error worth surfacing. */
  tooLong: boolean;
}

/**
 * Trims `raw`; an empty result commits nothing. A draft longer than
 * `maxItemLength` (when provided) is rejected and flagged `tooLong` — the
 * caller is expected to keep the draft text so the user can shorten it,
 * rather than clearing it as if it had committed. An exact duplicate of an
 * existing entry commits nothing, silently (not an error).
 */
export function resolveTagCommit(raw: string, existing: string[], maxItemLength?: number): TagCommitResult {
  const tag = raw.trim();
  if (!tag) return { next: null, tooLong: false };
  if (maxItemLength !== undefined && tag.length > maxItemLength) {
    return { next: null, tooLong: true };
  }
  if (existing.includes(tag)) return { next: null, tooLong: false };
  return { next: [...existing, tag], tooLong: false };
}
