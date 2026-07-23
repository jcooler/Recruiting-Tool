"use client";

import type { ChangeEvent } from "react";
import { useMe, useMembers, useSetMemberRole } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { ApiClientError } from "@/lib/api-client";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { IconUser, IconX } from "@/components/ui/icons";

function MembersSkeleton() {
  return (
    <div className="mt-4 flex flex-col">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-0">
          <Skeleton width={140} height={14} />
          <Skeleton width={110} height={30} />
        </div>
      ))}
    </div>
  );
}

/**
 * Settings → Members: a real `<table>` (Member / Role) listing everyone in
 * the workspace. Admins get a `NativeSelect` per row wired to
 * `useSetMemberRole`; everyone else sees a read-only role `Badge`. Owns its
 * own `useMembers()` fetch/loading/error state so `SettingsView` can mount
 * it independently of the Profile/Workspace queries above it.
 */
export function MembersSection() {
  const me = useMe();
  const members = useMembers();
  const { isAdmin } = useCan();
  const setRole = useSetMemberRole();

  function handleRoleChange(userId: string, event: ChangeEvent<HTMLSelectElement>) {
    const role = event.target.value as Role;
    setRole.mutate(
      { userId, role },
      {
        onError: (err) => {
          toast({
            title: "Couldn't update role",
            description: err instanceof ApiClientError ? err.message : "Something went wrong. Try again.",
            variant: "error",
          });
        },
      }
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="members-heading">
      <h2 id="members-heading" className="text-sm font-semibold text-text">
        Members
      </h2>

      {members.isError ? (
        <EmptyState
          icon={<IconX size={18} />}
          title="Couldn't load members"
          body="Something went wrong fetching your workspace's members."
          action={<Button onClick={() => members.refetch()}>Try again</Button>}
          className="py-10"
        />
      ) : members.isLoading || !members.data ? (
        <MembersSkeleton />
      ) : members.data.length === 0 ? (
        <EmptyState icon={<IconUser size={18} />} title="No members yet" className="py-10" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Workspace members and their roles</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-3">
                  Member
                </th>
                <th scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-3">
                  Role
                </th>
              </tr>
            </thead>
            <tbody>
              {members.data.map((member) => {
                const isSelf = member.id === me.data?.id;
                const isPendingThisRow = setRole.isPending && setRole.variables?.userId === member.id;
                return (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-sm font-medium text-text">{member.username}</td>
                    <td className="px-3 py-2.5">
                      {isAdmin ? (
                        <div className="max-w-[10rem]">
                          <label htmlFor={`member-role-${member.id}`} className="sr-only">
                            Role for {member.username}
                          </label>
                          <NativeSelect
                            id={`member-role-${member.id}`}
                            value={member.role}
                            disabled={isSelf || isPendingThisRow}
                            title={isSelf ? "You cannot change your own role" : undefined}
                            onChange={(event) => handleRoleChange(member.id, event)}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                      ) : (
                        <Badge variant="accent">{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
