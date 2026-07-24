# Device Optimization — handoff for a fresh session (written 2026-07-24)

Input document for a new session to brainstorm → plan → execute. Read this FIRST, then
`.superpowers/sdd/progress.md` (bottom RESUME block + follow-up backlog).

## Repo state

- Branch `feat/ats-overhaul` at `edaa8e6`, 69 commits over merge-base `22fbf6e` with `main`.
- Passed a whole-branch merge review (READY) + fix wave + two user-reported fix rounds; all gates
  green: unit 226/226, e2e 11/11 (7 specs incl. 44-screenshot/22-axe-scan audit at zero
  violations), contrast 34/34, tsc, build, Lighthouse 100/100/CLS-0.
- **Landing is ON HOLD by the owner's decision**: manual review found the two problems below. Fix
  §1 and plan §2 before any merge/PR conversation resumes.

## §1 PRIORITY 0 — UNFIXED: board card menu blacks out the app under device emulation

**Owner's repro (2026-07-24, post-`edaa8e6`):** Chrome DevTools device toolbar, multiple device
profiles, dark theme, `/candidates` board view → tap a card's three-dots ("Actions for …") menu →
entire app behind the menu goes black; menu items render. Reproduces across emulated devices.

**Critical history — do not repeat this mistake:** commit `edaa8e6` already fixed ONE real bug in
this exact gesture (drawer silently reopening via a stale `?candidate=` searchParams race between
`pipeline-view.tsx`'s deep-link read-effect and `candidate-drawer.tsx`'s close write-effect — see
the long comment in `pipeline-view.tsx` and `.superpowers/sdd/task-33c-report.md`). That fix was
verified with MOUSE-style Playwright clicks in a resized 390×844 viewport and passed. The owner
reproduces the blackout ANYWAY under DevTools device emulation — which simulates TOUCH. Every
prior verification was structurally blind to touch event paths.

**Mandatory first step (superpowers:systematic-debugging):** reproduce under REAL touch emulation
before touching any code — Playwright device descriptor with `hasTouch: true` (e.g.
`devices["iPhone 14"]`) and `page.tap()`/touchscreen APIs, NOT bare `browser_resize` + click. Then
identify what mounts/paints the black layer (DOM snapshot while reproduced). Leading hypotheses,
in order:
1. Touch-path propagation: Radix DropdownMenu triggers open on `pointerdown`; under touch the
   subsequent synthesized click may land on the card's name button (`candidate-card.tsx` renders
   name-button then menu trigger) and open the drawer beneath the menu — full-bleed dark at
   mobile widths = "black screen". (This was the controller's original hypothesis for the first
   round; it was set aside when the mouse-path race reproduced first. It was never tested under
   touch.)
2. dnd-kit sensor interplay: the card is a `useDraggable` with listeners spread on it; touch
   activation (TouchSensor/PointerSensor constraints) may interact with the tap differently.
3. Something else — follow the evidence, not this list.

Fix at the root; keep the `edaa8e6` guard (it fixed a real adjacent bug); add an e2e pin that runs
the gesture UNDER TOUCH EMULATION (new spec or a touch-project in playwright.config — note the
config currently defines only a mouse-profile chromium project).

## §2 Responsive/device coverage — the actual plan to write

**The gap:** the executed plan's visual matrix was exactly two viewports — 1440×900 desktop and
390×844 phone. No tablet breakpoint was ever designed, reviewed, or screenshotted. Tailwind
`sm/md/lg` classes exist ad hoc (app-shell sidebar, dashboard grids, job-header stat grid) but
nothing between 391px and 1439px was ever LOOKED at. The owner's verdict: half-baked for real
device variety. They are right.

**Scope to brainstorm with the owner, then plan:**
- Target matrix (proposal — confirm in brainstorm): 390×844 phone portrait · 768×1024 tablet
  portrait · 1024×768 / 1194×834 tablet landscape · 1280×800 laptop · 1440×900 desktop; touch AND
  mouse input profiles; both themes.
- Per-view responsive design pass (frontend-design skill), worst-risk first: pipeline board
  (column layout/horizontal scroll/drag on touch), candidates table (fixed 1170px min-width vs
  tablet), candidate drawer (full-bleed vs panel breakpoint), app-shell (sidebar collapse
  behavior — currently binary), dialogs (add/edit candidate two-column?), dashboard + analytics
  grids, settings, landing, auth.
- Touch interaction correctness everywhere, not just layout: dnd-kit drag on touch devices
  (long-press activation?), dropdown/menu taps, drawer swipe/close affordances, hover-only
  affordances (hover reveals need touch equivalents), target sizes (24px min — axe checked at
  desktop only).
- Extend `tests/e2e/audit.spec.ts` matrix to the tablet viewports + a touch project; axe at every
  new size; refresh `docs/screenshots/` and the gallery README; update root README claims.
- Definition of done: owner walks every view in DevTools device emulation across the matrix and
  finds nothing broken.

## §3 Infrastructure the new session inherits

- SDD machinery: `.superpowers/sdd/` — `progress.md` ledger (append per task, keep RESUME block
  current), `task-brief`/`review-package` scripts under the superpowers plugin cache (see ledger
  header lines for exact paths), per-task briefs/reports/diff-packages as established.
- Offline verification pattern (machine had a DNS outage; partially recovered — GitHub reachable
  as of 2026-07-24, npm registry still assume cache-only until proven otherwise):
  mongodb-memory-server via scratch launcher + `npm run seed` + dev server with `MONGODB_URI` env
  override; NEVER edit `.env.local`. Working launcher: session scratchpad `start-mongo-user.js`
  (copy per purpose, unique ports).
- e2e constraints: `playwright.config.ts` hardcodes baseURL:3000 (parameterization is on the
  follow-up backlog — consider doing it early, it has taxed every session); `auth.spec.ts`
  hardcodes two absolute 3000 URLs; demo rate limit 5/hr forces batching specs across fresh
  seeds (`task-32b-report.md` documents the pattern); two `next dev` instances must never share
  `.next` (corruption); the owner often keeps a dev server on port 3000 with a mongod on 27418 —
  never kill processes you didn't start, pause theirs only with notice.
- Commit discipline: conventional messages + trailer `Co-Authored-By: Claude Fable 5
  <noreply@anthropic.com>`; task-scoped reviews per subagent-driven-development; fix
  Critical/Important before closing a task.
- Non-gating follow-up backlog + v2 feature backlog (applications model, LLM resume parsing,
  resume tab polish): ledger bottom + memory file `v2-backlog.md`. Deployment prerequisite when
  landing finally happens: real-Atlas seed smoke + Vercel project Root Directory fix + env vars
  (see ledger).

## §4 Kickoff prompt for the new session

```
Read docs/superpowers/plans/2026-07-24-device-optimization-handoff.md in full, then the RESUME
block and follow-up backlog at the bottom of .superpowers/sdd/progress.md. Work on branch
feat/ats-overhaul.

Priority 0 (before any planning): the UNFIXED blackout regression in handoff §1. Use
superpowers:systematic-debugging — reproduce under real touch emulation (Playwright hasTouch
device descriptor, tap events) exactly as §1 mandates, root-cause with DOM evidence, fix at the
root, add a touch-emulation e2e pin, run the full gates, and get it task-reviewed per
superpowers:subagent-driven-development.

Then: use superpowers:brainstorming with me to settle the device/viewport matrix and per-view
questions in handoff §2, write the implementation plan with superpowers:writing-plans (save under
docs/superpowers/plans/), and execute it with superpowers:subagent-driven-development, task
reviews included. The definition of done is §2's: I walk every view in DevTools device emulation
across the agreed matrix and find nothing broken.
```
