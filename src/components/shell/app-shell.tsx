"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMe } from "@/hooks/queries";
import { useUiStore } from "@/stores/ui";
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
 * nav drawer, command palette). Rendered once by `app/(app)/layout.tsx`,
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

  return (
    <>
      <a href="#main" className={SKIP_LINK_CLASS}>
        Skip to content
      </a>

      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        {me?.isDemo && <DemoBanner me={me} />}
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onOpenNav={() => setMobileNavOpen(true)} />
            <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto px-6 py-6 md:px-8 focus:outline-none">
              {children}
            </main>
          </div>
        </div>
      </div>

      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <CommandPalette />
    </>
  );
}
