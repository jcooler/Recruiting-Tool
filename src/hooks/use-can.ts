"use client";

import { useMe } from "./queries";

export interface CanFlags {
  /** False for interviewers (read-only) and while the current role is unknown. */
  canEdit: boolean;
  isAdmin: boolean;
}

/**
 * Derives coarse-grained UI capability flags from the signed-in user's role.
 * Pure presentation gating (hide/disable actions) — every mutating API route
 * re-checks the role server-side, so this hook only needs to be "mostly
 * right, fail closed": with no role loaded yet, both flags default to false
 * rather than momentarily granting access.
 */
export function useCan(): CanFlags {
  const { data: me } = useMe();
  const role = me?.role;
  return {
    canEdit: role !== undefined && role !== "interviewer",
    isAdmin: role === "admin",
  };
}
