"use client";

import { useEffect, useState } from "react";
import { applyTheme, getTheme, THEME_CHANGE_EVENT, type Theme } from "@/lib/theme";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

/**
 * Toggles between the light and dark themes. Reads the currently applied
 * theme from the document after mount (the no-flash inline script has
 * already resolved it by then) so the initial server-rendered markup never
 * needs to guess the visitor's theme.
 */
export function ThemeToggle() {
  // Always initialize to "light", on both server and client — reading
  // `document` here would make the *client's own first render* diverge from
  // the server-rendered markup whenever the visitor's actual theme differs
  // (a real hydration-mismatch, not just a cosmetic one-frame flash), since
  // this initializer runs again on the client during hydration itself, not
  // after it. The effect below corrects the icon immediately post-mount.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => setTheme(getTheme() ?? "light");
    sync();
    // Theme can also change via the command palette's "Toggle theme" action
    // (or, in principle, another mounted ThemeToggle) — re-sync whenever
    // `applyTheme` runs anywhere, not just from this button's own click.
    document.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => document.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  function handleToggle() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
      {/* hidden below sm: this button's icon+aria-label carry the control on
          its own (a sun/moon toggle is a widely-recognized convention) —
          the full label competing for space in the app shell's mobile
          topbar (alongside the nav trigger, search, and account menu) left
          too little room for the search button's own "⌘K" hint, which
          rendered with the K visibly clipped. Verified live: hiding this
          span reclaims that space at exactly the width it was needed. */}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
