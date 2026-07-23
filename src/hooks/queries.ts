"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AnalyticsData } from "@/lib/analytics";
import type { CandidateDto, JobDto, UserDto } from "@/lib/dto";
import type { EmploymentType, Role, Source, Stage } from "@/lib/types";
import { toast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export interface CandidateFilters {
  jobId?: string;
  search?: string;
  stage?: Stage;
  tag?: string;
  rejected?: boolean;
}

export const queryKeys = {
  me: ["me"] as const,
  jobs: ["jobs"] as const,
  job: (id: string) => ["jobs", id] as const,
  candidates: (f: CandidateFilters) => ["candidates", f] as const,
  candidate: (id: string) => ["candidates", "detail", id] as const,
  analytics: ["analytics"] as const,
  members: ["members"] as const,
  workspace: ["workspace"] as const,
};

// ---------------------------------------------------------------------------
// Me / auth / demo
// ---------------------------------------------------------------------------

export interface LoginInput {
  username: string;
  password: string;
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<UserDto>("/api/users/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginInput) => api<UserDto>("/api/users/login", { method: "POST", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SignupInput) => api<UserDto>("/api/users/signup", { method: "POST", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>("/api/users/logout", { method: "POST" }),
    onSuccess: () => {
      // `removeQueries` (not `invalidateQueries`): every logout call site
      // (Topbar, CommandPalette) navigates away in its own `onSuccess`,
      // which TanStack Query runs after this one — but that navigation is
      // async (Next.js still has to fetch/compile the target route), so the
      // still-mounted AppShell/AuthGate is briefly still an active observer
      // of `me` right here. `invalidateQueries` with its default
      // `refetchType: "active"` would eagerly refetch against exactly that
      // still-mounted AuthGate, which sees the resulting 401 and
      // independently calls `router.replace("/login")` — racing the
      // caller's own `router.push("/")` and sometimes winning it, landing
      // signed-out users on /login instead of the marketing page.
      // `invalidateQueries({ refetchType: "none" })` closes that race but
      // trades it for a *second* one: it leaves the previous user's `me`
      // data in the cache merely marked stale, and `AuthGate` only gates on
      // `isLoading`/`isError` — so the *next* login's fresh AuthGate mount
      // would serve that stale (wrong) identity/role synchronously before
      // its own background refetch corrects it, i.e. a flash of the
      // previous session's UI. `removeQueries` avoids both: it deletes the
      // cache entry outright rather than refetching it, so (a) the
      // currently-mounted AuthGate here never sees a fetch or an error —
      // nothing calls `.fetch()` just because a query was removed, only a
      // fresh *mount* does that (see `shouldFetchOnMount` in
      // `@tanstack/query-core`), and this AuthGate is not remounting, only
      // unmounting — and (b) there is no stale data left for the next
      // mount (Landing, or the next login's AuthGate) to serve; it starts
      // from a genuine loading state instead.
      queryClient.removeQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useStartDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>("/api/demo/start", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useSwitchDemoRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { role: Role }) => api<{ role: Role }>("/api/demo/role", { method: "POST", json: body }),
    onSuccess: () => {
      // Switching the demo role changes what every screen is allowed to show
      // (role-gated actions, nav, etc.) — invalidate the whole cache rather
      // than trying to enumerate what's affected.
      queryClient.invalidateQueries();
    },
  });
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface CreateJobInput {
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  description?: string;
  status?: "open" | "closed";
}

export type UpdateJobInput = Partial<CreateJobInput>;

export function useJobs() {
  return useQuery({
    queryKey: queryKeys.jobs,
    queryFn: () => api<JobDto[]>("/api/jobs"),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.job(id),
    queryFn: () => api<JobDto>(`/api/jobs/${id}`),
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateJobInput) => api<JobDto>("/api/jobs", { method: "POST", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

export function useUpdateJob(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateJobInput) => api<JobDto>(`/api/jobs/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
      queryClient.invalidateQueries({ queryKey: queryKeys.job(id) });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/api/jobs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

// Pure, exported for unit testing. Mirrors `candidateListQuerySchema`:
// undefined/empty values are omitted, and `rejected` is stringified to
// "true"/"false" (the query schema only accepts those two string literals).
export function buildCandidateQuery(filters: CandidateFilters): string {
  const params = new URLSearchParams();
  if (filters.jobId) params.set("jobId", filters.jobId);
  if (filters.search) params.set("search", filters.search);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.rejected !== undefined) params.set("rejected", filters.rejected ? "true" : "false");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface CandidateExperienceInput {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
}

export interface CreateCandidateInput {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  source: Source;
  stage?: Stage;
  tags?: string[];
  skills?: string[];
  experience?: CandidateExperienceInput[];
  education?: string;
  desiredPay?: string;
  resumeText?: string;
}

export type UpdateCandidateInput = Partial<
  Omit<CreateCandidateInput, "jobId" | "stage" | "resumeText">
>;

export function useCandidates(filters: CandidateFilters) {
  return useQuery({
    queryKey: queryKeys.candidates(filters),
    queryFn: () => api<CandidateDto[]>(`/api/candidates${buildCandidateQuery(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: queryKeys.candidate(id),
    queryFn: () => api<CandidateDto>(`/api/candidates/${id}`),
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCandidateInput) => api<CandidateDto>("/api/candidates", { method: "POST", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

export function useUpdateCandidate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCandidateInput) =>
      api<CandidateDto>(`/api/candidates/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/api/candidates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
}

export function useAddNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { body: string }) =>
      api<CandidateDto>(`/api/candidates/${id}/notes`, { method: "POST", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

export function useSetRating(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { rating: number }) =>
      api<CandidateDto>(`/api/candidates/${id}/rating`, { method: "PATCH", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Stage moves — the optimistic mutation (verbatim from the task-17 brief)
// ---------------------------------------------------------------------------

export interface MoveStagePayload {
  candidateId: string;
  stage?: Stage;
  rejected?: boolean;
}

// Pure, exported for unit testing. `setQueriesData({ queryKey: ["candidates"] })`
// uses TanStack Query's prefix matching, so it also matches the candidate-detail
// cache entry (queryKeys.candidate -> ["candidates", "detail", id]), whose cached
// value is a single CandidateDto object rather than an array. Guard against that
// shape here so a cached detail view can't make `.map` throw and silently abort
// the whole mutation (the detail cache itself is refreshed by onSettled's
// invalidation instead).
export function applyStageMove(
  cache: unknown,
  candidateId: string,
  patch: { stage?: Stage; rejected?: boolean }
): unknown {
  if (!Array.isArray(cache)) return cache;
  return cache.map((c: CandidateDto) =>
    c.id === candidateId
      ? {
          ...c,
          ...(patch.stage !== undefined ? { stage: patch.stage, rejected: false } : { rejected: patch.rejected! }),
        }
      : c
  );
}

export function useMoveStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, ...body }: MoveStagePayload) =>
      api<CandidateDto>(`/api/candidates/${candidateId}/stage`, { method: "PATCH", json: body }),
    onMutate: async ({ candidateId, stage, rejected }) => {
      await queryClient.cancelQueries({ queryKey: ["candidates"] });
      const previous = queryClient.getQueriesData<CandidateDto[]>({ queryKey: ["candidates"] });
      queryClient.setQueriesData<CandidateDto[]>({ queryKey: ["candidates"] }, (old) =>
        applyStageMove(old, candidateId, { stage, rejected }) as CandidateDto[] | undefined
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast({ title: "Couldn't move candidate", description: "Your change was rolled back.", variant: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] }); // stage counts
    },
  });
}

// ---------------------------------------------------------------------------
// Analytics / members / workspace / resume parsing
// ---------------------------------------------------------------------------

export interface MemberDto {
  id: string;
  username: string;
  role: Role;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  isDemo: boolean;
  expiresAt?: string;
}

export interface ParseResumeResult {
  text: string;
  fields: { name?: string; email?: string; phone?: string; skills: string[] };
}

export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: () => api<AnalyticsData>("/api/analytics"),
  });
}

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: () => api<MemberDto[]>("/api/workspace/members"),
  });
}

export function useSetMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api<MemberDto>(`/api/workspace/members/${userId}`, { method: "PATCH", json: { role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useWorkspace() {
  return useQuery({
    queryKey: queryKeys.workspace,
    queryFn: () => api<WorkspaceDto>("/api/workspace"),
  });
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => api<WorkspaceDto>("/api/workspace", { method: "PATCH", json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      // `useMe()`'s `workspaceName` (shown in the topbar) is denormalized
      // from the same workspace document — without this, the topbar would
      // keep showing the pre-rename name until something else happened to
      // refetch `/api/users/me`.
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

export function useParseResume() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api<ParseResumeResult>("/api/resumes/parse", { method: "POST", body: form });
    },
  });
}
