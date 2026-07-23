"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMe } from "@/hooks/queries";
import { useUiStore } from "@/stores/ui";
import { AddCandidateDialog } from "@/components/candidate/add-candidate-dialog";
import { CandidateDrawer } from "@/components/candidate/candidate-drawer";
import { Sidebar, MobileSidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DemoBanner } from "./demo-banner";
import { CommandPalette } from "./command-palette";

const SKIP_LINK_CLASS =
  "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] " +
  "focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg " +
  "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg";

/**
 * The authenticated chrome: skip link, sidebar + topbar landmarks, main
 * content slot, and the pieces that float above everything else (mobile
 * nav drawer, command palette, candidate profile drawer, add-candidate
 * dialog). Rendered once by `app/(app)/layout.tsx`,
 * inside `AuthGate` — by the time this mounts, `useMe()` is guaranteed to
 * resolve from cache (AuthGate already fetched it) rather than re-fetching.
 *
 * The global ⌘K / Ctrl+K listener lives here (not inside CommandPalette
 * itself) per the task brief, so it's unambiguous there is exactly one
 * shortcut handler for the whole app shell.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(!useUiStore.getState().paletteOpen);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPaletteOpen]);

  // Scopes document-level scroll-locking to exactly while this shell is
  // mounted (authenticated routes only — never the marketing/auth pages,
  // which are ordinary tall documents that need real page scroll).
  //
  // The root wrapper below is `h-screen overflow-hidden`, which correctly
  // caps *its own* box and every flex descendant down to `<main>` (each one
  // reports a bounded scrollHeight matching the 900px viewport — verified
  // live via computed styles). But none of that constrains `<html>` itself:
  // with no explicit height/overflow on `html`/`body` (app/globals.css only
  // sets background/color on them), Chromium's root-scroller resolution
  // still let `document.documentElement.scrollHeight` balloon to the full
  // unclipped height of deeply-nested `overflow-y-auto` content (e.g. a
  // pipeline board with enough candidates) — confirmed live: a mouse-wheel
  // scroll over the *sidebar* (nowhere near `#main`) moved the whole page,
  // scrolling the sidebar and topbar off-screen instead of just `#main`'s
  // own content scrolling internally. Locking overflow on the true root
  // element removes `<html>` as a candidate scrolling element entirely, so
  // every scroll gesture routes to the nearest real `overflow-y-auto`
  // ancestor (`#main`, or the sidebar nav) as intended.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <>
      <a href="#main" className={SKIP_LINK_CLASS}>
        Skip to content
      </a>

      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        {me?.isDemo && <DemoBanner me={me} />}
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          {/* min-h-0 (not just the row above's): a column-direction flex
              item's default min-height is `auto`, i.e. it refuses to shrink
              below its own content's natural height — without this, a tall
              child (main, below) props this column open past h-screen's
              fixed height instead of yielding to `main`'s own scroll, and
              the whole page starts scrolling as a unit instead of just
              `main`. Verified live: a full-page screenshot of a
              many-candidate pipeline board rendered 3245px tall (sidebar and
              topbar scrolling away with it) instead of clipping to the
              900px viewport with the board scrolling internally. Every link
              in a nested flex/scroll chain needs its own min-h-0 — the outer
              min-h-0 above only fixes its own level. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Topbar onOpenNav={() => setMobileNavOpen(true)} />
            {/* tabIndex 0, not -1: this region also scrolls (overflow-y-auto)
                whenever a page's content outgrows the viewport (e.g.
                /analytics at 900px tall) — axe's scrollable-region-focusable
                rule flagged -1 here as unreachable-by-keyboard scrollable
                content. 0 keeps the skip link's `href="#main"` focus target
                working exactly as before (still focusable) while also
                putting it in the normal tab order right after the skip
                link, so a keyboard user can reach it and scroll with
                arrow/Page keys on any page tall enough to need it.

                focus-visible ring (WCAG 2.4.7): `tabIndex={0}` above makes
                this a real, keyboard-reachable stop — it needs a visible
                indicator like every other focusable control in the app, not
                just the skip-link's own target.

                Deliberately uses the `ring-*` idiom (ThemeToggle, the skip
                link above) rather than the app's more common
                `outline-2 outline-accent` one (Topbar's buttons, etc.):
                verified live (computed styles + the generated Tailwind CSS)
                that the `outline-*` idiom is currently a no-op everywhere
                it's used — `focus-visible:outline-none`'s literal
                `outline-style: none` is emitted *after*
                `focus-visible:outline-2`'s `outline-style:
                var(--tw-outline-style)` in the generated stylesheet, so at
                equal specificity it always wins the cascade and no outline
                ever renders. `ring-*` composes via `box-shadow` instead —
                a disjoint property `outline-none` never touches — and was
                confirmed to render correctly. `ring-inset` (no
                `ring-offset-*`) instead of the usual offset ring: `<main>`
                fills the scroll column edge-to-edge, so an outward-offset
                ring would be clipped by the viewport on the top/left/right
                sides; an inset ring stays fully visible and reads cleanly
                against the large content area in both themes. */}
            <main
              id="main"
              tabIndex={0}
              className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
            >
              {children}
            </main>
          </div>
        </div>
      </div>

      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette />
      <CandidateDrawer />
      <AddCandidateDialog />
    </>
  );
}
