# ApplicantWizard

A full-stack Applicant Tracking System (ATS) built as a portfolio project: job requisitions, a
candidate pipeline, resume parsing, analytics, and role-based team management, on a Next.js 15
App Router codebase with MongoDB, Zod validation, and cookie-based sessions.

This repository originally shipped as a split app — an Express/MongoDB API (`backend/`) and a
separate Next.js 14 frontend (`frontend/`) that proxied to it. Both were rebuilt from scratch as a
single Next.js 15 application (this repo root) across a 30-task plan: same product, one codebase,
server-rendered routes, API route handlers, and a shared auth/validation/rate-limit pipeline. The
legacy split apps were deleted once "before" screenshots were captured (see
[Screenshots](#screenshots)) — their history is still in git.

## Live demo

No production deployment is configured for this rebuild yet — `[live-demo-url-placeholder]`.
Run it locally (see [Local setup](#local-setup)) or use `npm run seed` for a ready-made account
(see [Demo credentials](#demo-credentials)). The app also has a built-in one-click demo: the
landing page's "View Live Demo" button calls `POST /api/demo/start`, which spins up a throwaway
workspace with seed data and an admin session that expires after 24 hours — no signup required.

## Features

- **Job requisitions** — create, edit, delete, and list openings, each showing a live count of
  candidates per pipeline stage.
- **Candidate pipeline** — a drag-and-drop stage board (`applied → screening → interview → offer →
  hired`) plus a searchable/filterable table view (by job, stage, tag, or free-text search across
  name/email/skills), with per-candidate notes, a star rating, an activity timeline, and
  reject/restore.
- **Resume parsing** — upload a PDF or DOCX résumé; the server extracts text and a best-effort
  skills list against a known-skills dictionary.
- **Analytics dashboard** — funnel/stage-overview charts, KPIs, and a combined activity feed
  across the workspace (built with Recharts).
- **Workspace & team** — rename the workspace, view members, and (admin-only) change a member's
  role.
- **Demo mode** — one-click ephemeral workspace with seeded data, auto-expiring after 24 hours,
  plus a "viewing as" role switcher (demo workspaces only) to preview the app as Admin, Recruiter,
  or Interviewer without re-authenticating.
- **Auth** — signup/login/logout with server-side sessions (no JWTs), one workspace per tenant.
- **Light/dark theme** with a WCAG-checked color-token contrast script (`npm run contrast`).

## Stack

- **Framework:** Next.js 15 (App Router, React 19), TypeScript (strict), Tailwind CSS v4
- **Data:** MongoDB via Mongoose 8; `mongodb-memory-server` for tests
- **Validation:** Zod schemas on every write path
- **Auth:** bcrypt password hashing + opaque, hashed, server-side session tokens (no JWT)
- **UI:** Radix UI primitives, `@dnd-kit` (drag-and-drop pipeline board), `@tanstack/react-table`
  + `react-virtual`, `react-hook-form`, Recharts, Framer Motion, `cmdk`
- **Resume parsing:** `pdf-parse`, `mammoth` (DOCX)
- **Testing:** Vitest (unit/integration, real Mongo semantics via `mongodb-memory-server`),
  Playwright (`test:e2e` script — not yet configured; arrives in a later task)

## Architecture

### `withAuth` request pipeline

Every authenticated API route handler is wrapped by `withAuth` (`src/lib/with-auth.ts`), which
runs the same guard sequence before the route's own logic ever executes:

```
Incoming request
      │
      ▼
1. Origin/CSRF check   Mutating methods (POST/PATCH/PUT/DELETE) must have a
                        same-origin `Origin` header, or the request is
                        rejected — 403 Cross-origin request rejected
      │
      ▼
2. Rate limit           Per-route scope + client IP, atomic MongoDB counter
                        (opts.rateLimit) — 429 Too many requests + Retry-After
                        on exceed
      │
      ▼
3. DB connect            Cached Mongoose connection (dbConnect)
      │
      ▼
4. Session              `aw_session` cookie → SHA-256 hash → Session lookup
                        — 401 if missing, unknown, or expired
      │
      ▼
5. User                 Session.userId → User document — 401 if not found
      │
      ▼
6. Workspace            User.workspaceId → Workspace document — 401 if not
                        found
      │
      ▼
7. Role (minRole)       roleRank[user.role] >= roleRank[minRole] — 403
                        Insufficient role if not (skipped when no minRole
                        is configured for the route)
      │
      ▼
  Route handler(req, { user, params })
```

Public routes (`withPublic` — login, signup, demo start) run steps 1–3 only, skipping session/user/
workspace/role since there's no authenticated user yet. Every request also gets Zod-validated
input and a uniform error shape (`{ error: string }`) from a shared `handleApiError` (Zod issues
become 400s with the offending field named).

## Local setup

```bash
cp .env.example .env.local     # set MONGODB_URI and SESSION_SECRET
npm install
npm run seed                   # seeds a demo workspace, admin user, jobs, and candidates
npm run dev                    # http://localhost:3000
```

`.env.example` requires:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string (defaults to `mongodb://localhost:27017/applicantwizard`) |
| `SESSION_SECRET` | Random string, 32+ chars |

## Demo credentials

`npm run seed` creates a workspace called **Acme Talent** with an admin account:

| Field | Value |
|---|---|
| Username | `demo` |
| Password | `demo-password-123` |

(Source: `scripts/seed.ts`.) This is separate from the in-app "View Live Demo" button, which
creates its own throwaway workspace via `POST /api/demo/start` instead of using these credentials.

## Security

### RBAC matrix

Roles are ranked `interviewer < recruiter < admin` (`src/lib/types.ts`). "Min role" is the lowest
role the route accepts; every row also requires a valid session. Verified directly against each
route's `withAuth`/`withPublic` options in `app/api/**/route.ts`.

| Route | Method | Access | Min role | Rate-limit scope |
|---|---|---|---|---|
| `/api/users/signup` | POST | public | — | `auth` |
| `/api/users/login` | POST | public | — | `auth` |
| `/api/users/logout` | POST | session | any | — |
| `/api/users/me` | GET | session | any | — |
| `/api/demo/start` | POST | public | — | `demo` |
| `/api/demo/role` | POST | session (demo workspace only) | any | `mutation` |
| `/api/jobs` | GET | session | any | — |
| `/api/jobs` | POST | session | recruiter | `mutation` |
| `/api/jobs/:jobId` | GET | session | any | — |
| `/api/jobs/:jobId` | PATCH / DELETE | session | recruiter | `mutation` |
| `/api/candidates` | GET | session | any | — |
| `/api/candidates` | POST | session | recruiter | `mutation` |
| `/api/candidates/:id` | GET | session | any | — |
| `/api/candidates/:id` | PATCH / DELETE | session | recruiter | `mutation` |
| `/api/candidates/:id/stage` | PATCH | session | recruiter | `mutation` |
| `/api/candidates/:id/notes` | POST | session | any | `mutation` |
| `/api/candidates/:id/rating` | PATCH | session | any | `mutation` |
| `/api/resumes/parse` | POST | session | recruiter | `parse` |
| `/api/analytics` | GET | session | any | — |
| `/api/workspace` | GET | session | any | — |
| `/api/workspace` | PATCH | session | admin | `mutation` |
| `/api/workspace/members` | GET | session | any | — |
| `/api/workspace/members/:userId` | PATCH | session | admin | `mutation` |

Notes/ratings are intentionally open to every authenticated role (including `interviewer`) so
interviewers can leave feedback without recruiter-level write access to jobs or candidates
themselves.

### Validation

Every route parses its input through a Zod schema (`src/lib/schemas/*.ts`) before touching the
database — e.g. `createJobSchema`, `updateCandidateSchema`, `stageMoveSchema`, `loginSchema`. IDs
are validated against a strict 24-hex-char pattern (`objectIdSchema`). A thrown `ZodError` is
translated by `handleApiError` (`src/lib/api-error.ts`) into a `400` with the first failing field
named, e.g. `"email: Invalid email"`.

### Rate limits

Enforced per scope + client IP with an atomic MongoDB upsert (no separate check-then-write race
window) in `src/lib/rate-limit.ts`:

| Scope | Limit | Window | Used by |
|---|---|---|---|
| `auth` | 10 | 15 min | login, signup |
| `mutation` | 120 | 1 min | job/candidate/workspace writes |
| `demo` | 5 | 1 hour | demo start |
| `parse` | 20 | 1 min | resume parsing |

Exceeding a limit returns `429` with a `Retry-After` header.

### Sessions

- Opaque 32-byte random token; only its SHA-256 hash is stored server-side (`src/lib/session.ts`).
- Cookie (`aw_session`) is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- 1-hour rolling idle timeout, refreshed on every authenticated request, capped by a 7-day absolute
  expiry (24 hours for demo-mode sessions).
- Login is timing-safe against username enumeration: a dummy bcrypt hash is compared even when the
  username doesn't exist, so the response time doesn't leak which check failed.

### Headers (`next.config.ts`, applied to every route)

`Content-Security-Policy` (strict `default-src 'self'`; `'unsafe-eval'` only in dev, for React
Refresh), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm test             # vitest run — 226 tests across 28 files, real Mongo semantics via
                      # mongodb-memory-server
npm run lint         # next lint
npm run contrast     # WCAG contrast check on the design-token palette (both themes) — 34 checks
npm run test:e2e     # playwright test — 7 specs: auth/board/demo/rbac/resume/table flows plus a
                      # full-matrix screenshot + axe accessibility audit (see below). Requires a
                      # real MongoDB and a running dev server — see playwright.config.ts's header.
```

## Screenshots

Screenshots live under [`docs/screenshots/`](docs/screenshots/):

- **`before/`** — the legacy split frontend (`frontend/`, Next.js 14 + Bootstrap), captured at
  desktop (1440×900) and mobile (390×844) viewports immediately before it was deleted. Its proxied
  API was unreachable when these were taken, so both show the logged-out state.
- **`after/`** — this rebuild, captured by `tests/e2e/audit.spec.ts`: every major view (landing,
  login, dashboard, jobs, job detail, candidates board/table, candidate drawer, add-candidate,
  analytics, settings) × both themes × desktop/mobile viewports (44 PNGs). The same spec runs a
  full `@axe-core/playwright` scan (WCAG 2.0/2.1/2.2 AA) against every view/theme combination at
  desktop size and asserts zero violations — re-run `npx playwright test tests/e2e/audit.spec.ts`
  to regenerate after a visual change.
