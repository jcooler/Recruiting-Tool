"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ROLE_LABELS } from "@/lib/types";
import { useLogout, useMe } from "@/hooks/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  IconBoard,
  IconBriefcase,
  IconChart,
  IconLogout,
  IconSettings,
  IconUser,
  type IconProps,
} from "@/components/ui/icons";

export interface NavLinkDef {
  href: string;
  label: string;
  icon: (props: IconProps) => React.JSX.Element;
}

export const NAV_LINKS: NavLinkDef[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconBoard },
  { href: "/jobs", label: "Jobs", icon: IconBriefcase },
  { href: "/candidates", label: "Candidates", icon: IconUser },
  { href: "/analytics", label: "Analytics", icon: IconChart },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

/** `/jobs` is "current" on `/jobs` itself and on any `/jobs/*` detail route. */
function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The five primary nav links, shared between the desktop `<nav>` (Sidebar)
 * and the mobile Drawer (MobileSidebar) so active-state logic only lives
 * once. `onNavigate` lets the mobile drawer close itself on link click.
 */
export function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex flex-col gap-0.5", className)}>
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                active ? "bg-accent-soft text-accent" : "text-text-2 hover:bg-surface-2 hover:text-text"
              )}
            >
              <Icon size={17} className={active ? "text-accent" : "text-text-3"} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
        AW
      </span>
      <span className="truncate text-sm font-semibold tracking-tight text-text">ApplicantWizard</span>
    </Link>
  );
}

/** Desktop primary navigation landmark. Hidden below `md`; see MobileSidebar for the small-viewport equivalent. */
export function Sidebar() {
  return (
    <nav aria-label="Primary" className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface md:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Logo />
      </div>
      <div className="flex-1 px-3 py-4">
        <NavLinks />
      </div>
    </nav>
  );
}

export interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Small-viewport (< md) stand-in for Sidebar: the same nav links inside a
 * Drawer, opened via the Topbar hamburger button. The desktop sidebar has
 * no user info of its own (that lives in the Topbar's account dropdown), so
 * the drawer surfaces it in a footer row instead — this is the only place a
 * mobile visitor can see their account/role or sign out.
 */
export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const { data: me } = useMe();
  const router = useRouter();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => router.push("/") });
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Navigation"
      footer={
        me ? (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar seed={me.username} name={me.username} size={32} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{me.username}</p>
                <Badge variant="accent">{ROLE_LABELS[me.role]}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" loading={logout.isPending} onClick={handleLogout}>
              <IconLogout size={15} />
              Log out
            </Button>
          </div>
        ) : undefined
      }
    >
      <NavLinks onNavigate={() => onOpenChange(false)} />
    </Drawer>
  );
}
