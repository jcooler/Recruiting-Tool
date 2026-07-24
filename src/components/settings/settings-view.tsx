"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMe, useRenameWorkspace, useWorkspace, type WorkspaceDto } from "@/hooks/queries";
import { useCan } from "@/hooks/use-can";
import { ApiClientError } from "@/lib/api-client";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { IconX } from "@/components/ui/icons";
import { MembersSection } from "./members-section";

// Mirrors the server's `z.string().trim().min(1).max(80)` — kept purely so
// the input can't even be typed past the limit the API will enforce anyway.
const WORKSPACE_NAME_MAX = 80;

function SectionCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby={id}>
      <h2 id={id} className="text-sm font-semibold text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Loading placeholder with the same card/heading footprint as `SectionCard`, so the page doesn't reflow once data arrives. */
function SectionSkeleton({ titleWidth }: { titleWidth: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <Skeleton width={titleWidth} height={15} />
      <div className="mt-4">
        <Skeleton height={36} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-sm text-text-3">{label}</dt>
      <dd className="truncate text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

function ProfileSection({ username, email }: { username: string; email?: string }) {
  return (
    <SectionCard id="profile-heading" title="Profile">
      <dl className="mt-2 flex flex-col divide-y divide-border">
        <InfoRow label="Username" value={username} />
        <InfoRow label="Email" value={email ?? "—"} />
      </dl>
    </SectionCard>
  );
}

/**
 * Admins get an inline-edit `Field` + Save button wired to
 * `useRenameWorkspace()`; everyone else sees the same read-only row as
 * Profile. Save stays disabled until the trimmed value both differs from
 * the current name and isn't empty — the server enforces the same rule,
 * this just avoids a round trip that would only come back a 400.
 */
function WorkspaceSection({ workspace, isAdmin }: { workspace: WorkspaceDto; isAdmin: boolean }) {
  const renameWorkspace = useRenameWorkspace();
  const [name, setName] = useState(workspace.name);

  // Keep the draft in sync when the server value changes from elsewhere
  // (another admin's rename, or this mutation's own success) — but never
  // clobber an unsaved edit already in progress (e.g. a background
  // window-focus refetch landing while the admin is mid-keystroke).
  useEffect(() => {
    setName((current) => (current.trim().length > 0 && current.trim() !== workspace.name ? current : workspace.name));
  }, [workspace.name]);

  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== workspace.name;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    renameWorkspace.mutate(
      { name: trimmed },
      {
        onSuccess: () => toast({ title: "Workspace renamed", variant: "success" }),
        onError: (err) => {
          toast({
            title: "Couldn't rename workspace",
            description: err instanceof ApiClientError ? err.message : "Something went wrong. Try again.",
            variant: "error",
          });
        },
      }
    );
  }

  return (
    <SectionCard id="workspace-heading" title="Workspace">
      {isAdmin ? (
        <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Field label="Workspace name" id="workspace-name">
              <Input value={name} maxLength={WORKSPACE_NAME_MAX} onChange={(event) => setName(event.target.value)} />
            </Field>
          </div>
          <Button type="submit" loading={renameWorkspace.isPending} disabled={!dirty}>
            Save
          </Button>
        </form>
      ) : (
        <dl className="mt-2">
          <InfoRow label="Workspace name" value={workspace.name} />
        </dl>
      )}
    </SectionCard>
  );
}

function AppearanceSection() {
  return (
    <SectionCard id="appearance-heading" title="Appearance">
      <div className="mt-4 flex flex-col items-start gap-2">
        <ThemeToggle />
        <p className="text-sm text-text-3">Follows your system preference until you choose.</p>
      </div>
    </SectionCard>
  );
}

/** Only rendered for `isDemo` workspaces — points at the role switcher already sitting in `DemoBanner` above the shell rather than duplicating it here. */
function DemoSection() {
  return (
    <SectionCard id="demo-heading" title="Demo">
      <p className="mt-2 text-sm text-text-2">
        This is a shared demo sandbox — its data resets automatically, so nothing here is permanent. To see the app
        from another role, use the &ldquo;Viewing as&rdquo; switcher in the banner above to switch between Admin,
        Recruiter, and Interviewer.
      </p>
    </SectionCard>
  );
}

/**
 * `/settings`: a single-column stack of section cards — Profile, Workspace,
 * Members (own file + own `useMembers()` fetch, see `./members-section`),
 * Appearance, and (demo workspaces only) Demo. Admin-only controls
 * (workspace rename, member role selects) collapse to read-only rows/Badges
 * for non-admins via `useCan().isAdmin`, so a demo role-switch to a lower
 * role collapses them live with no reload.
 *
 * Members/Appearance render unconditionally rather than waiting on
 * `me`/`workspace` to resolve: Members owns its own loading state and would
 * otherwise fetch a beat later than it needs to, and Appearance has no
 * network dependency at all.
 */
export function SettingsView() {
  const me = useMe();
  const workspace = useWorkspace();
  const { isAdmin } = useCan();

  const profileError = me.isError || workspace.isError;
  const profileLoading = me.isLoading || workspace.isLoading || !me.data || !workspace.data;

  function retryProfile() {
    me.refetch();
    workspace.refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-text">Settings</h1>

      {profileError ? (
        <EmptyState
          icon={<IconX size={18} />}
          title="Couldn't load your profile"
          body="Something went wrong fetching your account and workspace."
          action={<Button onClick={retryProfile}>Try again</Button>}
        />
      ) : profileLoading ? (
        <>
          <SectionSkeleton titleWidth={70} />
          <SectionSkeleton titleWidth={100} />
        </>
      ) : (
        <>
          <ProfileSection username={me.data.username} email={me.data.email} />
          <WorkspaceSection workspace={workspace.data} isAdmin={isAdmin} />
        </>
      )}

      <MembersSection />
      <AppearanceSection />

      {me.data?.isDemo && <DemoSection />}
    </div>
  );
}
