"use client";

import { useEffect, useState } from "react";

// Debounces `value`, re-syncing `ms` after the last change. Used for search
// inputs feeding `useCandidates(filters)` so keystrokes don't each trigger a
// request.
export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timeout);
  }, [value, ms]);

  return debounced;
}
