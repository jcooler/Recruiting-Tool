"use client";

import type { HTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ROLE_LABELS } from "@/lib/types";
import { useLogout, useMe } from "@/hooks/queries";
import { useUiStore } from "@/stores/ui";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { IconChevronDown, IconLogout, IconMenu, IconSearch } from "@/components/ui/icons";

/** Small inline key-hint chip. Shared by the search button here and the shortcut legend in CommandPalette. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-3",
        className
      )}
      {...props}
    />
  );
}

export interface TopbarProps {
  /** Opens the mobile nav Drawer (rendered by AppShell, `md:hidden` trigger lives here). */
  onOpenNav: () => void;
}

export function Topbar({ onOpenNav }: TopbarProps) {
  const { data: me } = useMe();
  const router = useRouter();
  const logout = useLogout();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => router.push("/") });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation menu"
        className={cn(
          "-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-2 transition-colors md:hidden",
          "hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        )}
      >
        <IconMenu size={18} />
      </button>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className={cn(
          "flex h-9 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-text-3 transition-colors sm:flex-none sm:w-64",
          "hover:border-text-3/50 hover:text-text-2 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        )}
      >
        <IconSearch size={15} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Search or jump to…</span>
        {/* hidden below sm: a ⌘/Ctrl hint is meaningless on a touchscreen
            with no physical keyboard, and at mobile widths there wasn't
            room for it anyway — verified live, it rendered with the "K"
            visibly clipped off (this button is flex-1/min-w-0 in a packed
            topbar row). Dropping it here also gives the truncating label
            above actual room to show text on mobile instead of collapsing
            to nothing. */}
        <Kbd aria-hidden="true" className="hidden shrink-0 sm:inline">
          ⌘K
        </Kbd>
      </button>

      {/* Current workspace name (renamed from Settings → Workspace). Hidden below
          `sm` where the search button itself is still flex-1 and there's no room;
          `min-w-0` lets it truncate instead of forcing the row wider. */}
      {me?.workspaceName && (
        <p
          className="hidden min-w-0 flex-1 truncate text-sm font-medium text-text-2 sm:block"
          title={me.workspaceName}
        >
          {me.workspaceName}
        </p>
      )}

      {/* `shrink-0`: the search button and workspace name above are the row's only
          flexible/truncating elements — ThemeToggle's full-text label has no wrap
          handling of its own, so without this the flex row would shrink it instead
          and wrap its text across multiple lines at narrow (mobile) widths. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ThemeToggle />

        <Dropdown>
          <DropdownTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                "flex items-center gap-1.5 rounded-md p-1 pr-1.5 transition-colors",
                "hover:bg-surface-2 focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              )}
            >
              <Avatar seed={me?.username ?? "account"} name={me?.username ?? "Account"} size={28} />
              <IconChevronDown size={14} className="text-text-3" />
            </button>
          </DropdownTrigger>
          <DropdownContent className="w-56">
            {me && (
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <Avatar seed={me.username} name={me.username} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{me.username}</p>
                  <Badge variant="accent" className="mt-0.5">
                    {ROLE_LABELS[me.role]}
                  </Badge>
                </div>
              </div>
            )}
            <DropdownSeparator />
            <DropdownItem onSelect={handleLogout}>
              <IconLogout size={15} />
              Log out
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
