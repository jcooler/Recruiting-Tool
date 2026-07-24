export type Theme = "light" | "dark";

export const THEME_COOKIE = "aw_theme";

/** Fired on `document` after `applyTheme` runs, so any mounted listener (e.g. `ThemeToggle`) can re-sync its own state — there can be more than one theme-changing control on screen at once (Topbar's toggle, the command palette's "Toggle theme" action). */
export const THEME_CHANGE_EVENT = "aw:theme-change";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Applies a theme to the document and persists the choice in a cookie so the
 * server can render the matching `data-theme` attribute on the next request.
 */
export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  document.cookie = `${THEME_COOKIE}=${t}; max-age=${ONE_YEAR_SECONDS}; path=/; SameSite=Lax`;
  document.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
}

/** Reads the theme currently applied to the document, if any. */
export function getTheme(): Theme | undefined {
  const current = document.documentElement.dataset.theme;
  return current === "light" || current === "dark" ? current : undefined;
}
