# Screenshot gallery

Visual record of the Task 1–33 rebuild: a split Express API + Next.js 14 frontend, replaced by a
single Next.js 15 App Router codebase (MongoDB, Zod validation, cookie sessions, RBAC). See the
[root README](../../README.md) for the full feature list and setup instructions; this page is the
before/after picture, plus an index of every screen this rebuild ships.

## What shipped

- **Pipeline** — a drag-and-drop stage board (`applied → screening → interview → offer → hired`)
  and a virtualized, sortable/filterable table view, both with an explicit **Active / Rejected**
  mode (reject, restore, read-only rejected cards) and a searchable command palette.
- **Candidates** — résumé upload (PDF/DOCX) with server-side parsing and add-candidate prefill, a
  profile drawer with notes, star rating, and activity timeline.
- **Jobs, analytics, settings** — job requisitions with live per-stage candidate counts, a KPI +
  charts analytics view (Recharts, isolated to its own route chunk — see
  [Route sizes](#route-sizes-production-build) below), and workspace member/role management.
- **Auth & RBAC** — signup/login/logout, an admin ↔ interviewer role switch that gates drag,
  reject, and member-management actions.
- **Accessibility & quality bar** — 34/34 WCAG contrast checks (both themes), a full-matrix
  `@axe-core/playwright` audit (22 view/theme scans, zero violations), 226 unit tests across 28
  files, 10 Playwright e2e cases across 7 spec files, and a Lighthouse pass on the public landing
  page — see [Lighthouse](#lighthouse-landing-page) below.

## Before → after

`before/` holds 2 screenshots of the **legacy** split app, captured immediately before its
`backend/`/`frontend/` directories were deleted (Task 30). Its proxied API was already unreachable
at capture time, so both show the **logged-out** state only — there was no way to capture an
authenticated legacy screen. `after/` is this rebuild's full 44-shot matrix, captured by
[`tests/e2e/audit.spec.ts`](../../tests/e2e/audit.spec.ts).

The closest same-URL comparison is the new landing page (also logged-out); the dashboard is shown
alongside it as what a visitor reaches one click later ("View Live Demo" / sign in) — the legacy
app had no reachable equivalent to show here.

<table>
<tr>
<th></th>
<th>Before (legacy, logged out)</th>
<th>After — landing (logged out)</th>
<th>After — dashboard (signed in)</th>
</tr>
<tr>
<td><strong>Desktop</strong></td>
<td><a href="before/desktop-home.png"><img src="before/desktop-home.png" width="220" alt="Legacy desktop home, logged out"></a></td>
<td><a href="after/landing-light-desktop.png"><img src="after/landing-light-desktop.png" width="220" alt="New landing page, desktop, light theme"></a></td>
<td><a href="after/dashboard-light-desktop.png"><img src="after/dashboard-light-desktop.png" width="220" alt="New dashboard, desktop, light theme"></a></td>
</tr>
<tr>
<td><strong>Mobile</strong></td>
<td><a href="before/mobile-home.png"><img src="before/mobile-home.png" width="140" alt="Legacy mobile home, logged out"></a></td>
<td><a href="after/landing-light-mobile.png"><img src="after/landing-light-mobile.png" width="140" alt="New landing page, mobile, light theme"></a></td>
<td><a href="after/dashboard-light-mobile.png"><img src="after/dashboard-light-mobile.png" width="140" alt="New dashboard, mobile, light theme"></a></td>
</tr>
</table>

The full matrix below covers every view in both themes and both viewports, including the ones the
legacy app never had a working equivalent of (pipeline board/table, résumé parsing, analytics,
RBAC-aware candidate drawer, settings/members).

## Full after-matrix index

All 44 shots, grouped by view. Click any thumbnail for the full-resolution PNG. Captured with
`prefers-reduced-motion` forced on, so every shot is a settled end-state, not a mid-transition
frame.

<table>
<tr><th>View</th><th>Light · Desktop</th><th>Light · Mobile</th><th>Dark · Desktop</th><th>Dark · Mobile</th></tr>

<tr><td><strong>Landing</strong> <sub>(logged out)</sub></td>
<td><a href="after/landing-light-desktop.png"><img src="after/landing-light-desktop.png" width="150"></a></td>
<td><a href="after/landing-light-mobile.png"><img src="after/landing-light-mobile.png" width="90"></a></td>
<td><a href="after/landing-dark-desktop.png"><img src="after/landing-dark-desktop.png" width="150"></a></td>
<td><a href="after/landing-dark-mobile.png"><img src="after/landing-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Login</strong></td>
<td><a href="after/login-light-desktop.png"><img src="after/login-light-desktop.png" width="150"></a></td>
<td><a href="after/login-light-mobile.png"><img src="after/login-light-mobile.png" width="90"></a></td>
<td><a href="after/login-dark-desktop.png"><img src="after/login-dark-desktop.png" width="150"></a></td>
<td><a href="after/login-dark-mobile.png"><img src="after/login-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Dashboard</strong></td>
<td><a href="after/dashboard-light-desktop.png"><img src="after/dashboard-light-desktop.png" width="150"></a></td>
<td><a href="after/dashboard-light-mobile.png"><img src="after/dashboard-light-mobile.png" width="90"></a></td>
<td><a href="after/dashboard-dark-desktop.png"><img src="after/dashboard-dark-desktop.png" width="150"></a></td>
<td><a href="after/dashboard-dark-mobile.png"><img src="after/dashboard-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Jobs</strong> <sub>(list)</sub></td>
<td><a href="after/jobs-light-desktop.png"><img src="after/jobs-light-desktop.png" width="150"></a></td>
<td><a href="after/jobs-light-mobile.png"><img src="after/jobs-light-mobile.png" width="90"></a></td>
<td><a href="after/jobs-dark-desktop.png"><img src="after/jobs-dark-desktop.png" width="150"></a></td>
<td><a href="after/jobs-dark-mobile.png"><img src="after/jobs-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Job detail</strong></td>
<td><a href="after/job-detail-light-desktop.png"><img src="after/job-detail-light-desktop.png" width="150"></a></td>
<td><a href="after/job-detail-light-mobile.png"><img src="after/job-detail-light-mobile.png" width="90"></a></td>
<td><a href="after/job-detail-dark-desktop.png"><img src="after/job-detail-dark-desktop.png" width="150"></a></td>
<td><a href="after/job-detail-dark-mobile.png"><img src="after/job-detail-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Candidates</strong> <sub>(board)</sub></td>
<td><a href="after/candidates-board-light-desktop.png"><img src="after/candidates-board-light-desktop.png" width="150"></a></td>
<td><a href="after/candidates-board-light-mobile.png"><img src="after/candidates-board-light-mobile.png" width="90"></a></td>
<td><a href="after/candidates-board-dark-desktop.png"><img src="after/candidates-board-dark-desktop.png" width="150"></a></td>
<td><a href="after/candidates-board-dark-mobile.png"><img src="after/candidates-board-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Candidates</strong> <sub>(table)</sub></td>
<td><a href="after/candidates-table-light-desktop.png"><img src="after/candidates-table-light-desktop.png" width="150"></a></td>
<td><a href="after/candidates-table-light-mobile.png"><img src="after/candidates-table-light-mobile.png" width="90"></a></td>
<td><a href="after/candidates-table-dark-desktop.png"><img src="after/candidates-table-dark-desktop.png" width="150"></a></td>
<td><a href="after/candidates-table-dark-mobile.png"><img src="after/candidates-table-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Candidate drawer</strong></td>
<td><a href="after/candidate-drawer-light-desktop.png"><img src="after/candidate-drawer-light-desktop.png" width="150"></a></td>
<td><a href="after/candidate-drawer-light-mobile.png"><img src="after/candidate-drawer-light-mobile.png" width="90"></a></td>
<td><a href="after/candidate-drawer-dark-desktop.png"><img src="after/candidate-drawer-dark-desktop.png" width="150"></a></td>
<td><a href="after/candidate-drawer-dark-mobile.png"><img src="after/candidate-drawer-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Add candidate</strong> <sub>(résumé upload)</sub></td>
<td><a href="after/add-candidate-light-desktop.png"><img src="after/add-candidate-light-desktop.png" width="150"></a></td>
<td><a href="after/add-candidate-light-mobile.png"><img src="after/add-candidate-light-mobile.png" width="90"></a></td>
<td><a href="after/add-candidate-dark-desktop.png"><img src="after/add-candidate-dark-desktop.png" width="150"></a></td>
<td><a href="after/add-candidate-dark-mobile.png"><img src="after/add-candidate-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Analytics</strong></td>
<td><a href="after/analytics-light-desktop.png"><img src="after/analytics-light-desktop.png" width="150"></a></td>
<td><a href="after/analytics-light-mobile.png"><img src="after/analytics-light-mobile.png" width="90"></a></td>
<td><a href="after/analytics-dark-desktop.png"><img src="after/analytics-dark-desktop.png" width="150"></a></td>
<td><a href="after/analytics-dark-mobile.png"><img src="after/analytics-dark-mobile.png" width="90"></a></td>
</tr>

<tr><td><strong>Settings</strong> <sub>(members)</sub></td>
<td><a href="after/settings-light-desktop.png"><img src="after/settings-light-desktop.png" width="150"></a></td>
<td><a href="after/settings-light-mobile.png"><img src="after/settings-light-mobile.png" width="90"></a></td>
<td><a href="after/settings-dark-desktop.png"><img src="after/settings-dark-desktop.png" width="150"></a></td>
<td><a href="after/settings-dark-mobile.png"><img src="after/settings-dark-mobile.png" width="90"></a></td>
</tr>

</table>

Regenerate the whole matrix with:

```
npx playwright test tests/e2e/audit.spec.ts
```

(requires a real MongoDB and a running dev server — see `playwright.config.ts`'s header comment).

## Lighthouse (landing page)

Ran against a production build (`npm run build && npm start`) with a seeded, unauthenticated
`/` request, headless Chromium, desktop preset:

```
npx lighthouse http://localhost:3000 --preset=desktop \
  --only-categories=performance,accessibility,best-practices,seo \
  --output html --output-path docs/lighthouse-landing.html \
  --chrome-flags="--headless=new"
```

Full report: [`docs/lighthouse-landing.html`](../lighthouse-landing.html).

| Category | Score | Threshold | Result |
|---|---|---|---|
| Performance | **100** | ≥ 90 | PASS |
| Accessibility | **100** | ≥ 95 | PASS |
| Cumulative Layout Shift | **0** | near-zero | PASS |
| Best Practices | 96 | — | 1 informational flag (see below) |
| SEO | 90 | — | 1 informational flag (see below) |

Both sub-90 items were investigated and are **not app regressions**:

- **`errors-in-console`** (Best Practices): a single logged `401` from `GET /api/users/me` on the
  logged-out landing page. This is the landing page's own documented sign-in check
  (`src/components/marketing/landing.tsx`, drives the "Open dashboard" vs. "Get started" CTA) —
  a 401 for a visitor with no session is the correct, intended response, not an error to suppress.
- **`meta-description`** (SEO): Lighthouse evaluates the raw, pre-hydration HTML response, and
  Next.js 15 defers `<title>`/`<meta>` tags into a streamed `<body>` chunk (React's own boundary
  -replacement mechanism) for any request whose User-Agent isn't in its `htmlLimitedBots` list
  (Slackbot/Twitterbot/Discordbot/etc. — bots that can't run the replacement script). That's a
  User-Agent check only (`next/dist/server/lib/streaming-metadata.js`); traced and confirmed it's
  unrelated to this app's markup. Real browsers and JS-executing crawlers (including Google's main
  crawler) see the correct `<meta name="description">` within milliseconds of load — verified
  directly against a real headless-Chromium DOM render. Widening `htmlLimitedBots` to also match
  Lighthouse/regular browsers would force blocking renders for everyone just to move this one
  score, so it was left as Next's intentional default (see the comment on `ThemeScript` in
  [`src/components/theme/theme-script.tsx`](../../src/components/theme/theme-script.tsx) for the
  full trace through Next's source).

## Route sizes (production build)

`npm run build`, 25 routes. The Recharts-powered analytics chunk stays isolated to `/analytics`
(confirmed in Task 28: `/dashboard`'s bundle contains zero `recharts` references) — this build
re-confirms the split by size alone:

| Route | Size | First Load JS |
|---|---|---|
| `/` (landing) | 4.17 kB | 130 kB |
| `/analytics` | 2.56 kB | **105 kB** |
| `/dashboard` | 4.37 kB | **124 kB** |
| `/candidates` | 199 B | 235 kB |
| `/jobs` | 3.23 kB | 183 kB |
| `/jobs/[jobId]` | 1.66 kB | 269 kB |
| `/settings` | 5.48 kB | 122 kB |
| `/login`, `/signup` | ~142 B each | 148 kB |
| Shared by all routes | — | 102 kB |

`/analytics` (105 kB) vs. `/dashboard` (124 kB) — despite `/analytics` being the chart-heavy route
— is only possible because Recharts loads in its own on-demand chunk instead of the shared bundle.
