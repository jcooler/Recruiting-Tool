# Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. NOTE: this is an OPS plan — most tasks are controller-executed commands with verification, two tasks are OWNER GATES that pause for the owner.

**Goal:** The rebuilt ATS (branch `feat/ats-overhaul`) live in production on Vercel, backed by the existing Atlas cluster, verified end-to-end.

**Architecture:** Seed-smoke Atlas locally first (hard gate), then a git-connected Vercel project (owner imports the GitHub repo), PR → preview deployment → owner walkthrough → merge to `main` → production deployment → live verification. Spec: `docs/superpowers/specs/2026-07-24-vercel-deployment-design.md`.

**Tech Stack:** Next.js 15 (repo root, npm), MongoDB Atlas via mongoose, Vercel git integration, `gh` CLI (authed as jcooler), Vercel MCP tools for deployment status/logs.

## Global Constraints

- NEVER print, log, or commit `.env.local` values (Atlas URI, SESSION_SECRET). The owner copies them into Vercel themselves.
- NEVER edit `.env.local`.
- No force-push anywhere; `origin/main` (`297465e`) is a verified ancestor of the branch — ordinary push + merge only.
- Production demo rate limit is 5/hr per IP (`RATE_LIMITS.demo`): during verification spend at most 2 `View Live Demo` starts; use the seeded `demo`/`demo-password-123` login for everything deeper.
- HARD STOP on Task 1 failure (Atlas unreachable/auth) — report to owner, no retries against prod.
- Required Vercel env vars (Production + Preview): `MONGODB_URI`, `SESSION_SECRET` (schema `src/lib/env.ts` requires both; SECRET ≥32 chars).
- Owner-only actions are marked **OWNER GATE** — pause and ask, do not work around.
- Local dev processes: the session's memory-server stack (mongod :27431, dev :3000) belongs to this session and may be stopped freely; never kill processes this session did not start.

---

### Task D1: Real-Atlas seed smoke (ledger's deployment prerequisite)

**Files:** none created/modified. Uses `scripts/seed.ts` (reads `.env.local` itself via `process.loadEnvFile`).

**Interfaces:**
- Consumes: `.env.local`'s `MONGODB_URI` (Atlas), existing seed script.
- Produces: seeded `Acme Talent` workspace on Atlas (admin `demo`/`demo-password-123`, 5 jobs, 60 candidates) that Tasks D5/D6 log into.

- [ ] **Step 1: Stop the session's memory-server dev stack** (frees port 3000; Atlas check must not hit the offline stack)

Stop the background dev server task and confirm: `Get-NetTCPConnection -LocalPort 3000 -State Listen` → nothing. Keep mongod :27431 running (harmless, isolated).

- [ ] **Step 2: Run the seed against Atlas — NO env override**

```bash
cd d:/DEV/Recruiting-Tool && npm run seed
```

Expected output (exact shape):
```
Seeded workspace "Acme Talent"
  Admin username: demo
  Admin email:    demo@acmetalent.local
  Admin password: demo-password-123
  5 jobs, 60 candidates
```
On DNS/auth/timeout error: HARD STOP → report exact error text to owner (Atlas console / Network Access is theirs).

- [ ] **Step 3: Live login check against Atlas**

```bash
cd d:/DEV/Recruiting-Tool && npm run dev   # background; reads .env.local → Atlas
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/        # expect 200
```

Then POST a real login and confirm a session cookie:
```bash
curl -s -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d '{"username":"demo","password":"demo-password-123"}' | head -20
```
Expected: `HTTP/1.1 200` + `Set-Cookie: aw_session=...`. (401 → credential/seed mismatch; 500 → env/Atlas problem. Stop and report.)

- [ ] **Step 4: Stop the Atlas-backed dev server** (verification done; leave nothing running against prod DB)

### Task D2: **OWNER GATE** — Vercel project import + env vars

**Interfaces:**
- Produces: git-connected Vercel project (team `jon-coolers-projects`, repo `jcooler/Recruiting-Tool`) with both env vars — required before D3's PR can get a preview build.

- [ ] **Step 1: Ask the owner to do (dashboard):** Add New → Project → Import `jcooler/Recruiting-Tool`; Root Directory = repo root (default); Framework = Next.js (auto); set `MONGODB_URI` and `SESSION_SECRET` (values from local `.env.local`) for **Production + Preview**; click Deploy (first build will be of `main` = old code or may fail — irrelevant, D4's merge supersedes it).
- [ ] **Step 2: Verify via MCP** — `list_projects(teamId team_rJUYMBh8vfBuj2AKJDsG5EHx)` shows the project; `get_project` shows `link.repo` = Recruiting-Tool and both env var names present (names only, never values).

### Task D3: Push branch + open PR → preview deployment

**Interfaces:**
- Consumes: D2's git-connected project.
- Produces: PR URL + green preview deployment URL for the owner's D4 walkthrough.

- [ ] **Step 1: Push the branch**

```bash
cd d:/DEV/Recruiting-Tool && git push -u origin feat/ats-overhaul
```
Expected: new remote branch, no errors, NO force flag.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --base main --head feat/ats-overhaul --title "ATS overhaul: full rebuild (33 tasks, 6 phases)" --body "$(cat <<'EOF'
Full rebuild of the ATS as a single Next.js 15 app (old Express backend/ + CRA frontend/ removed in-branch).

- 33 planned tasks + 4 unplanned fix tasks, per-task reviews, whole-branch review verdict READY
- Gates at head: unit 226/226 · tsc · build · contrast 34/34 · e2e 11/11 (incl. 44-screenshot/22-axe audit at zero violations, new touch-emulation regression pin)
- Latest fix: device-emulation blackout root-caused to react-remove-scroll-bar scrollbar-gap miscompute (body collapsed to 0 width under any Radix modal); 3-line CSS neutralization + touch e2e pin (task-33d)

Deployment design: docs/superpowers/specs/2026-07-24-vercel-deployment-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR URL printed. Record the PR number.

- [ ] **Step 3: Wait for the Vercel preview build, verify READY**

Vercel MCP: `list_deployments(projectId, teamId)` → newest deployment for the branch; poll until `state: READY` (typical 1-3 min). On `ERROR`: `get_deployment_build_logs`, fix forward on the branch (normal gates), push again, re-poll.

- [ ] **Step 4: Smoke the preview URL** (preview is auth-protected only if the owner enabled it; expect public)

```bash
curl -s -o /dev/null -w "%{http_code}" https://<preview-url>/   # expect 200
```
Hand the owner: PR URL + preview URL.

### Task D4: **OWNER GATE** — preview walkthrough + merge go-ahead

- [ ] **Step 1: Owner clicks around the preview** (landing → View Live Demo → board → drawer → menu gesture; anything they care about).
- [ ] **Step 2: Owner says merge** (or reports defects → fix-forward loop on the branch, D3 Step 3 re-runs).

### Task D5: Merge to main → production deployment

- [ ] **Step 1: Merge the PR (no force, merge commit preserves the task history)**

```bash
gh pr merge <PR#> --merge
```
Expected: merged; `main` now contains the branch.

- [ ] **Step 2: Poll production deployment to READY**

Vercel MCP `list_deployments` → newest with `target: production`; poll to `READY`. On ERROR: `get_deployment_build_logs`, fix forward (new commit on main via PR if needed), report.

- [ ] **Step 3: Record the production URL** (default `<project>.vercel.app` domain from `get_project`).

### Task D6: Production verification + close-out

- [ ] **Step 1: HTTP smoke**

```bash
curl -s -o /dev/null -w "landing:%{http_code}\n" https://<prod-url>/
curl -s -I https://<prod-url>/ | grep -i "content-security-policy" | head -1
```
Expected: `landing:200`; strict CSP header present (prod CSP has no unsafe-eval — commit f8dd8a0's dev-only carve-out).

- [ ] **Step 2: Live walkthrough via Playwright against prod** (scratchpad script, chromium; 1 demo start + seeded login)

```js
// scratchpad/prod-verify.js — chromium against https://<prod-url>
// 1) landing loads; 2) View Live Demo → /dashboard (1 of max 2 demo starts);
// 3) /candidates board renders columns+cards; open card menu (mouse), open
//    drawer via View profile, close cleanly; 4) logout; 5) login as
//    demo/demo-password-123 → dashboard shows Acme Talent seeded data.
// Assert each stage with visible-text expectations; screenshot each stage to
// scratchpad for the report.
```
Expected: all stages pass; screenshots captured.

- [ ] **Step 3: Ledger + RESUME block close-out**

Append to `.superpowers/sdd/progress.md`: deployment tasks D1-D6 complete with prod URL; update RESUME block (deployed; v2 backlog is the next frontier). Commit ledger-adjacent repo docs only if any changed (ledger itself is git-ignored).

- [ ] **Step 4: Report to owner** — prod URL, what was verified, seeded login reminder, v2 backlog pointer.
