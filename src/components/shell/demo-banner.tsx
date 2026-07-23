"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/types";
import type { UserDto } from "@/lib/dto";
import { useSwitchDemoRole } from "@/hooks/queries";
import { toast } from "@/components/ui/toast";
import { NativeSelect } from "@/components/ui/field";
import { IconClock } from "@/components/ui/icons";

/**
 * Pure, exported for unit testing. `now` is threaded in (rather than read
 * internally via `Date.now()`) so the result is deterministic and the
 * component's re-render-every-minute tick is what drives freshness, not a
 * hidden read inside this function.
 */
export function formatDemoCountdown(expiresAt: string | undefined, now: number): string {
  if (!expiresAt) return "soon";
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "any moment";

  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export function DemoBanner({ me }: { me: UserDto }) {
  const [now, setNow] = useState(() => Date.now());
  const switchRole = useSwitchDemoRole();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
    const role = event.target.value as Role;
    switchRole.mutate(
      { role },
      {
        onError: () => {
          toast({ title: "Couldn't switch role", description: "Please try again.", variant: "error" });
        },
      }
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-accent-soft px-4 py-2 text-sm text-accent md:px-6">
      <p className="flex items-center gap-1.5 font-medium">
        <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        Demo workspace — data resets automatically
      </p>

      <p className="flex items-center gap-1 text-accent/80">
        <IconClock size={14} className="shrink-0" />
        resets in {formatDemoCountdown(me.demoExpiresAt, now)}
      </p>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="demo-role-switch" className="whitespace-nowrap text-sm font-medium">
          Viewing as
        </label>
        <div className="w-40">
          <NativeSelect
            id="demo-role-switch"
            value={me.role}
            disabled={switchRole.isPending}
            onChange={handleRoleChange}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
