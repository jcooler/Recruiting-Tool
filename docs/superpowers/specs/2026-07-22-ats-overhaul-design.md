# ATS Overhaul — Design Spec

**Date:** 2026-07-22
**Project:** Recruiting-Tool ("ApplicantWizard") — modernize from barebones candidate CRUD to a portfolio-grade applicant tracking system.

## Decisions made with the user

1. **Consolidate** the split Express backend + Next.js frontend into a **single Next.js app** (App Router). Mongoose models, MongoDB database, and session-cookie auth semantics are preserved; Express HTTP framing is replaced by Next.js route handlers.
2. **Workspace (org) data model**: candidates and jobs belong to a workspace shared by its members, each with a role. The old per-user ownership becomes a `createdBy` audit field.
3. **App Router** on Next.js 15, strict TypeScript throughout.
4. **No data migration** — existing Mongo data is test data and will be discarded/re-seeded.
5. **Styling**: Tailwind CSS v4 + custom design-token system (CSS variables per theme), Radix UI primitives for overlays/menus, no component-kit look.
6. **Resumes**: parse-and-discard. Extracted text + fields stored on the candidate; original file is not retained.

## 1. Architecture

- One Next.js 15 project (App Router) at repo root; `backend/` and `frontend/` directories are retired after the port. One Vercel deployment; no rewrite proxy, no CORS.
- **Directory shape** (final; exact file list belongs to the implementation plan):
  - `app/(marketing)/` — public landing page.
  - `app/(app)/` — authenticated dashboard shell (sidebar/topbar layout): `dashboard`, `jobs`, `jobs/[jobId]`, `candidates`, `analytics`, `settings`.
  - `app/api/*` — route handlers (see §4).
  - `src/models/` — Mongoose schemas (same `InferSchemaType` pattern as today).
  - `src/lib/` — db connection (cached for serverless), auth/session, RBAC, rate limiter, resume parsing, seeding, analytics aggregations, zod schemas (shared client/server).
  - `src/components/` — design system + feature components.
  - `src/stores/` — Zustand (ephemeral UI state only).
  - `scripts/seed.ts` — CLI seeding.
- **Server state**: TanStack Query for all reads/mutations; optimistic updates on stage moves. **Client state**: Zustand only for ephemeral UI (open drawer, drag state, palette open). No localStorage persistence of app data; backend is source of truth.
- **Sessions**: server-side `Session` collection in Mongo (`_id` = 128-bit random token hash, `userId`, `expiresAt` with TTL index; rolling expiry ~1h idle / 7d absolute for real users). Cookie is httpOnly, `secure` in production, `sameSite=lax`, holds only the opaque session token. This mirrors the current express-session + connect-mongo behavior (server-side revocation retained).
- **Route handler composition**: every API route is wrapped in `withAuth(handler, { role?, rateLimit? })` which resolves the session, loads the user + workspace, enforces the minimum role, applies rate limiting, and hands the handler a typed context `{ user, workspaceId }`. Input parsing is `zodSchema.strict().parse()` on body/query/params before any DB call.

## 2. Data model

All collections are new; Mongoose with `InferSchemaType`, `timestamps: true` (matching existing pattern).

- **Workspace**: `name`, `isDemo: boolean`, `expiresAt?: Date` (TTL index; set only on demo workspaces).
- **User**: `username` (unique), `email` (unique, `select: false`), `passwordHash` (`select: false`), `workspaceId`, `role: 'admin' | 'recruiter' | 'interviewer'`. bcrypt cost 10+ as today.
- **Session**: `tokenHash` (unique), `userId`, `expiresAt` (TTL index), `createdAt`.
- **Job**: `workspaceId` (indexed), `title`, `department`, `location`, `employmentType: 'full-time' | 'part-time' | 'contract' | 'intern'`, `status: 'open' | 'closed'`, `description`, `createdBy`.
- **Candidate**: `workspaceId` (indexed, compound with `jobId` and `stage`), `jobId`, `name`, `email`, `phone?`, `location?`, `avatarSeed` (DiceBear seed string; avatar URL derived client-side), `source: 'job-board' | 'referral' | 'agency' | 'outbound' | 'career-page' | 'other'`, `stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired'`, `rejected: boolean` (terminal archive flag — rejected candidates leave the board but keep their last stage for analytics), `stageHistory: [{ stage, enteredAt }]`, `rating: 0–5`, `tags: string[]`, `skills: string[]`, `experience: [{ company, title, startDate, endDate? }]`, `education?`, `desiredPay?`, `notes: [{ authorId, authorName, body, createdAt }]`, `activity: [{ type, actorId, actorName, meta, createdAt }]`, `resume?: { text, parsedFields: { name?, email?, phone?, skills[] }, parsedAt }`, `createdBy`.

Activity entries are appended server-side on create, stage move, rating change, note added, resume parsed — never trusted from the client.

`stageHistory` is the analytics backbone: every stage move appends `{ stage, enteredAt: now }`; time-in-stage = deltas between consecutive entries.

## 3. Security

- **RBAC** (enforced server-side in `withAuth`, reflected in UI by hiding/disabling):
  - `interviewer`: read everything in workspace; add notes; set ratings.
  - `recruiter`: interviewer + full CRUD on candidates and jobs, stage moves, resume upload.
  - `admin`: recruiter + manage members (change roles, remove), rename/delete workspace.
- **Validation**: zod `.strict()` schemas on every route's body/query/params — unknown keys rejected, so `$`-prefixed operator injection is structurally impossible; ObjectIds validated by regex/refine before use; all Mongo queries built from parsed values only, always scoped by `workspaceId` from the session (never from client input).
- **Rate limiting**: fixed-window counters in a Mongo `RateLimit` collection (TTL-indexed) keyed by IP + route class. Tight on `login`/`signup` (e.g. 10/15min), moderate on mutations (e.g. 120/min), demo-start limited per IP. Serverless-safe, no external infra. 429 responses with `Retry-After`.
- **Headers** (via `next.config` / middleware): CSP (self + data: for DiceBear inline SVGs — avatars generated via `@dicebear/core` locally, so no third-party image host in CSP), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`.
- **CSRF**: sameSite=lax cookie + Origin/Sec-Fetch-Site check on all state-changing methods.
- **Auth hardening** (semantics kept, not rewritten): bcrypt compare with generic "Invalid credentials" 401s (as today), signup password policy (min length 10, zod-enforced), session rotation on login, logout destroys the server-side session.
- **Secrets**: `MONGODB_URI`, `SESSION_SECRET` env-only, validated at boot (envalid-style zod check, matching current `validateEnv` pattern).
- Resume upload: 5 MB limit, MIME + magic-byte check (PDF/DOCX only), parsing wrapped in try/catch with a graceful "couldn't parse — fill in manually" path; file bytes never persisted.

## 4. API surface (`app/api/`)

| Route | Methods | Min role | Notes |
|---|---|---|---|
| `users/signup`, `users/login`, `users/logout`, `users/me` | POST/GET | public/session | signup creates user + workspace (admin role) |
| `workspace`, `workspace/members`, `workspace/members/[id]` | GET/PATCH/DELETE | admin for writes | member role management |
| `jobs`, `jobs/[jobId]` | GET/POST/PATCH/DELETE | recruiter for writes | list includes per-stage candidate counts (aggregation) |
| `candidates`, `candidates/[id]` | GET/POST/PATCH/DELETE | recruiter for writes | list supports `jobId`, `stage`, `search`, `tags` query filters |
| `candidates/[id]/stage` | PATCH | recruiter | dedicated stage-move endpoint; appends stageHistory + activity |
| `candidates/[id]/notes` | POST | interviewer | |
| `candidates/[id]/rating` | PATCH | interviewer | |
| `resumes/parse` | POST (multipart) | recruiter | returns extracted fields + text; does not create the candidate |
| `analytics` | GET | interviewer | funnel, time-in-stage, by-source, velocity — one aggregation endpoint |
| `demo/start` | POST | public (rate-limited) | see §5 |

Error contract: JSON `{ error: string }` with proper status codes (same shape the current frontend expects), plus zod issue details on 400 in development.

## 5. Demo mode (highest priority)

- Landing page has a prominent **View Live Demo** CTA → `POST /api/demo/start`:
  1. Creates a workspace `{ isDemo: true, expiresAt: now + 24h }`.
  2. Seeds it via the shared seeding module (`src/lib/seed.ts`, also used by `scripts/seed.ts`): ~5 open jobs across departments, ~60 candidates distributed across all stages/sources/ratings with faker-generated profiles, experience timelines, skills, notes, activity history, and DiceBear avatar seeds — every view populated.
  3. Creates an ephemeral demo user (admin role, unguessable random credentials, never displayed) and a real session cookie.
  4. Redirects to the dashboard. Zero friction, no signup.
- **Isolation**: all queries are workspace-scoped, so a demo session can drag/edit/delete freely without touching real data.
- **Cleanup**: Mongo TTL index on `Workspace.expiresAt` plus a cascade sweep (on each `demo/start`, delete jobs/candidates/users/sessions whose workspace no longer exists) — no cron infra required.
- **Demo banner** in the app shell: "Demo workspace — resets after 24h" + a **role switcher** (admin/recruiter/interviewer) that actually changes the demo user's role server-side, so visitors can watch RBAC hide/disable capabilities live. The switcher endpoint only works on `isDemo` workspaces.

## 6. Frontend / UX

- **Design direction** (set concretely with the frontend-design skill during implementation): Linear/Ashby-style calm SaaS — data-dense, strong hierarchy, one restrained accent, generous whitespace, equally polished light and dark themes.
- **Theme**: CSS-variable tokens; `data-theme` on `<html>`; default from `prefers-color-scheme`; toggle persisted in a cookie so SSR renders the right theme (no flash); AA contrast verified in both palettes.
- **Views**:
  - *Landing*: hero, feature highlights, View Live Demo, sign in/up.
  - *Dashboard*: KPI stat tiles (open roles, active candidates, offers out, hires this month) + recent activity feed.
  - *Pipeline board*: @dnd-kit columns Applied → Screening → Interview → Offer → Hired; drag between stages with optimistic TanStack Query mutation (rollback + toast on failure); keyboard sensors + live-region announcements; stage labels + icons (never color alone); per-job or all-jobs scope; mobile = horizontal snap-scroll columns.
  - *Table view* (toggle with board): TanStack Table with real `<table>` semantics, scoped `<th>`, sortable columns (name, job, stage, rating, tags, source, updated), debounced search, filters, virtualized rows (@tanstack/react-virtual) above ~50 rows.
  - *Candidate drawer* (Radix Dialog, focus-trapped, focus restored on close, URL-addressable via query param): avatar, contact, skills tags, experience timeline, resume text preview, star rating (labeled), notes composer, activity log.
  - *Jobs*: requisition cards/list with per-stage mini-funnel counts; job detail = its pipeline.
  - *Add candidate*: manual form or resume-upload path (parse → prefilled form → user confirms → create).
  - *Analytics*: Recharts funnel, avg time-in-stage bar, source donut/bar, weekly velocity line; lazy-loaded (`next/dynamic`) so charts never weigh down the main bundle.
  - *Settings*: profile, workspace members + roles (admin), theme.
- **Command palette**: cmdk on ⌘K/Ctrl-K — navigation, "Add candidate", "Go to job…", theme toggle.
- **Loading/empty/error**: react-loading-skeleton skeletons shaped like real content (board columns, table rows, drawer) with zero layout shift; empty states with CTAs ("No candidates yet — add one or upload a resume"); error states with retry via TanStack Query.
- **Motion**: Framer Motion micro-interactions (drawer slide, card settle, hover lift) fully disabled under `prefers-reduced-motion`.
- **Polish**: favicon + meta + OG image, responsive mobile-first, hover states, correct heading order and landmarks (`nav`, `main`, `aside`), labeled controls.

## 7. Performance

- Code-split analytics/charts and resume-parse UI via dynamic import.
- Virtualized long lists; debounced (250ms) search; memoized derived sort/filter data.
- Optimistic drag mutations; server aggregation for analytics (no client-side crunching of full datasets).
- Production build verified with Lighthouse: fast LCP, near-zero CLS.

## 8. Error handling

- API: central error → `{ error }` JSON mapping (401/403/404/409/422/429/500); unexpected errors logged server-side, generic message to client.
- Client: TanStack Query error boundaries per view; optimistic rollback with toast on failed mutations; resume parse failure → inline notice + manual entry fallback; network failure → retry affordances.

## 9. Testing & iteration loop

- **Vitest** (unit): zod schemas (incl. operator-injection attempts), RBAC guard matrix (role × route class), rate limiter windowing, resume field extraction, stage-move/stageHistory logic, analytics aggregation math.
- **Playwright** (e2e against dev server + real Mongo): signup/login/logout, demo entry lands on populated dashboard, drag candidate persists across reload, keyboard-only stage move, resume upload prefill, RBAC UI differences per role.
- **Visual/a11y pass**: Playwright screenshot matrix (desktop 1440 + mobile 390 × light/dark × every view) with self-critique iterations; axe scans in both themes with violations fixed; before/after screenshots delivered at the end.

## 10. Dependencies (added)

`@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual`, `zustand`, `zod`, `@dnd-kit/core` (+ sortable/utilities), `recharts`, `cmdk`, `react-loading-skeleton`, `framer-motion`, `tailwindcss@4`, Radix UI primitives, `@faker-js/faker` (dev/seed), `@dicebear/core` + collection (local SVG avatars), `pdf-parse`, `mammoth`, `bcrypt` (kept), `mongoose` (kept). Removed: bootstrap, react-bootstrap, express stack.

## Out of scope

Email sending, interview scheduling/calendar, LinkedIn or any paid API, multi-workspace membership per user, invitations by email (members are managed directly; demo showcases roles via the switcher), file retention of original resumes, i18n.
