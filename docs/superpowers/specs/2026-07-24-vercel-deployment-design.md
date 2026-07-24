# Vercel Deployment — design (2026-07-24, owner-approved)

Scope pivot decided by the owner mid-brainstorm: deploy the rebuilt app now;
the §2 responsive/device pass and the §2b resume-parser upgrade are parked
(see "Parked for v2" below, which banks today's settled decisions).

## What ships

- Branch `feat/ats-overhaul` at `bd3399f`: 71 commits over merge-base `22fbf6e`,
  whole-branch review verdict READY (fix wave closed), §1 device-emulation
  blackout fixed and task-reviewed (Task 33d), gates green
  (unit 226/226 · tsc · build · contrast 34/34 · e2e 11/11 incl. touch pin).
- Integration: **PR → merge to main**. `origin/main` (`297465e`, the old
  pre-rebuild app, 102 commits) is a verified ancestor of this lineage — the
  rebuild deleted the old `backend/`/`frontend/` in-branch (Task 30) — so this
  is an ordinary push + merge; no force-push, no history rewriting.

## Vercel project (fresh — the team has no projects; the old one is gone)

- Owner action (the MCP cannot git-connect a project): Vercel dashboard →
  Add New → Project → Import `jcooler/Recruiting-Tool` under team
  `jon-coolers-projects`. Root Directory: repo root (default). Framework:
  auto-detect (Next.js 15). Build/install commands: defaults (npm).
- Env vars, scopes Production + Preview, values copied by the owner from
  `.env.local` (never printed into chat/logs):
  - `MONGODB_URI` — required by `src/lib/env.ts` (runtime, lazy).
  - `SESSION_SECRET` — required ≥32 chars by the same schema (validated but
    not consumed; ledger follow-up "SESSION_SECRET unused" stands).

## Database

- Existing Atlas cluster from `.env.local`.
- Pre-merge gate: **real-Atlas seed smoke** (the ledger's long-deferred
  deployment prerequisite): run `npm run seed` locally with NO env override —
  `scripts/seed.ts` loads `.env.local` itself. Success = connect + seeded
  `Acme Talent` workspace (admin `demo` / `demo-password-123`, 5 jobs,
  60 candidates) + a local dev-server login against Atlas.
- Visitors: landing page "View Live Demo" creates ephemeral demo workspaces
  (24h sweep, 5/hr per-IP rate limit) — no additional prod data needed.
- Atlas Network Access must allow `0.0.0.0/0` (Vercel egress IPs are dynamic);
  expected already true from the old deployment — owner verifies in the Atlas
  console if the prod runtime can't connect.

## Order of operations

1. Controller: Atlas seed smoke (local). HARD STOP on failure — report, no
   retries against prod.
2. Owner: import repo + set 2 env vars in Vercel.
3. Controller: push `feat/ats-overhaul`, open PR with `gh` (summary of the
   rebuild + review verdict). Vercel builds a preview deployment for the PR.
4. Owner: click around the preview URL.
5. On owner's go: merge PR → production build from `main`.
6. Controller: verify production — landing renders, View Live Demo enters a
   demo workspace, board/drawer/menu gesture works, seeded login works —
   and report with the live URL.

## Failure handling

- Seed smoke fails (DNS/auth/timeout): stop; report exact error; owner decides
  (Atlas console access is theirs).
- Preview build fails: read build logs via Vercel MCP, fix forward on the
  branch (normal task flow, gates re-run), push again.
- Production runtime 500s on DB: check Atlas network access; env var typo is
  the next suspect (owner re-checks values; controller never sees them).

## Out of scope

- No README/docs updates unless asked. No custom domain work (Vercel default
  `*.vercel.app` domain). No analytics/monitoring setup.

## Parked for v2 (decisions banked from today's brainstorm — do not re-litigate)

- Responsive/device pass (owner: "parked indefinitely"):
  - Matrix: 390×844 / 768×1024 / 1194×834 / 1280×800 / 1440×900, both themes.
  - Input pairing: 390/768/1194 touch, 1280/1440 mouse; touch interaction e2e
    at 390 + 1194.
  - Candidates table below desktop: horizontal scroll + sticky name column.
  - App-shell tablet nav: icon-only rail 768–1279, full sidebar ≥1280,
    hamburger below 768.
  - dnd-kit touch: long-press activation (~250ms delay + 5px tolerance) via
    TouchSensor + touch-action CSS; mouse keeps 4px distance.
  - Known input: some mobile fullPage audit PNGs have 1380-wide canvases
    (board horizontal overflow) — pre-existing, noted in Task 33d.
- Resume parser (owner: "stub it in a version 2.0"): when resumed, heuristic
  tier first (first-10-lines name scan, headline-word skips, email-local-part
  fuzzy hint, "Name | contact" splitting, fixture corpus); LLM tier remains a
  separate later decision (v2 backlog memory).
