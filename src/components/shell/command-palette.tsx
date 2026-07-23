"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { useJobs, useLogout } from "@/hooks/queries";
import { useUiStore } from "@/stores/ui";
import { applyTheme, getTheme } from "@/lib/theme";
import {
  IconBoard,
  IconBriefcase,
  IconChart,
  IconLogout,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconUser,
  IconX,
  type IconProps,
} from "@/components/ui/icons";
import { Kbd } from "./topbar";

const NAV_ITEMS: { href: string; label: string; icon: (p: IconProps) => React.JSX.Element }[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconBoard },
  { href: "/jobs", label: "Jobs", icon: IconBriefcase },
  { href: "/candidates", label: "Candidates", icon: IconUser },
  { href: "/analytics", label: "Analytics", icon: IconChart },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text outline-none " +
  "data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent";

function GroupHeading({ children }: { children: ReactNode }) {
  return <span className="block px-2.5 pb-1.5 pt-3 text-xs font-medium text-text-3 first:pt-1.5">{children}</span>;
}

/**
 * cmdk is headless — every class here is the only styling that element
 * gets, there's no base to conflict with (unlike the UI kit's wrapper
 * components, which already carry their own Tailwind classes).
 *
 * Wired up like the shared `Dialog`/`Drawer`: raw Radix Dialog primitives
 * (not cmdk's own `Command.Dialog`, which doesn't expose an
 * `onCloseAutoFocus` hook) so focus restore matches the rest of the app.
 * Radix unmounts Content on close, so cmdk's internal search state resets
 * for free on every reopen.
 */
export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const setAddCandidateOpen = useUiStore((s) => s.setAddCandidateOpen);
  const { data: jobs } = useJobs();
  const logout = useLogout();
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, [open]);

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  function handleAddCandidate() {
    setAddCandidateOpen(true);
    setOpen(false);
  }

  function handleToggleTheme() {
    applyTheme(getTheme() === "dark" ? "light" : "dark");
    setOpen(false);
  }

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => router.push("/") });
    setOpen(false);
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={
            "fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 " +
            "data-[state=closed]:opacity-0 starting:opacity-0"
          }
        />
        <RadixDialog.Content
          aria-label="Command menu"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          className={
            "fixed left-1/2 top-[14%] z-50 w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 overflow-hidden " +
            "rounded-lg border border-border bg-surface shadow-lg outline-none transition-all duration-150 " +
            "data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0"
          }
        >
          <RadixDialog.Title className="sr-only">Command menu</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            Jump to a page, run an action, or open a job.
          </RadixDialog.Description>

          <Command aria-label="Command menu" className="flex max-h-[70vh] flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4">
              <IconSearch size={16} className="shrink-0 text-text-3" />
              <CommandInput
                autoFocus
                placeholder="Search or jump to…"
                className="h-12 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-3"
              />
              <RadixDialog.Close
                aria-label="Close command menu"
                className={
                  "shrink-0 rounded-md p-1 text-text-3 transition-colors hover:bg-surface-2 hover:text-text " +
                  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                }
              >
                <IconX size={15} />
              </RadixDialog.Close>
            </div>

            <CommandList className="overflow-y-auto p-2">
              <CommandEmpty className="px-3 py-8 text-center text-sm text-text-3">No results found.</CommandEmpty>

              <CommandGroup heading={<GroupHeading>Navigation</GroupHeading>}>
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                  <CommandItem key={href} onSelect={() => go(href)} className={ITEM_CLASS}>
                    <Icon size={16} />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading={<GroupHeading>Actions</GroupHeading>}>
                <CommandItem onSelect={handleAddCandidate} className={ITEM_CLASS}>
                  <IconPlus size={16} />
                  Add candidate
                </CommandItem>
                <CommandItem onSelect={handleToggleTheme} className={ITEM_CLASS}>
                  <IconSun size={16} />
                  Toggle theme
                </CommandItem>
                <CommandItem onSelect={handleLogout} className={ITEM_CLASS}>
                  <IconLogout size={16} />
                  Log out
                </CommandItem>
              </CommandGroup>

              {jobs && jobs.length > 0 && (
                <CommandGroup heading={<GroupHeading>Jobs</GroupHeading>}>
                  {jobs.map((job) => (
                    <CommandItem key={job.id} onSelect={() => go(`/jobs/${job.id}`)} className={ITEM_CLASS}>
                      <IconBriefcase size={16} />
                      <span className="truncate">{job.title}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>

            <div
              aria-hidden="true"
              className="flex items-center gap-3 border-t border-border px-4 py-2 text-xs text-text-3"
            >
              <span className="flex items-center gap-1">
                <Kbd>↑↓</Kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> Select
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Kbd>Esc</Kbd> Close
              </span>
            </div>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
