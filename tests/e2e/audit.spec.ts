import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { enterDemo } from "./helpers";

/**
 * Task 32's visual-quality capstone: screenshots every view in the matrix
 * below (11 views x 2 themes x 2 viewports = 44 PNGs under
 * docs/screenshots/after/) and, at desktop size, runs a full axe scan
 * (wcag2a/2aa/21aa/22aa) against every view x theme combo (22 checks) —
 * asserting zero violations. Overlay views (candidate-drawer, add-candidate)
 * are their own matrix entries specifically so axe runs *while they're open*
 * (see the brief: "overlays are where violations hide"), not just against
 * whatever page sits behind them.
 *
 * `aw_theme` mirrors src/lib/theme.ts's `THEME_COOKIE` constant — duplicated
 * rather than imported, same as every other spec in this directory hardcodes
 * its own selectors instead of importing app source (see board.spec.ts's
 * CARD_SELECTOR comment): this file runs under Playwright/Node, not the
 * app's own bundler, so there's no shared module graph to lean on.
 */
const THEME_COOKIE = "aw_theme";

const SCREENSHOT_DIR = path.join(__dirname, "..", "..", "docs", "screenshots", "after");

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const VIEWPORTS = [
  { vp: "desktop", width: 1440, height: 900 },
  { vp: "mobile", width: 390, height: 844 },
] as const;

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// `page.setDefaultTimeout()` only covers actions (click, fill, goto) — it
// does NOT raise `expect(locator)...`'s own default (5s), which is set
// separately per playwright.config.ts's global `expect` block (unset here,
// so it's Playwright's built-in 5s default). This dev server recompiles
// routes on demand and, under this matrix's sustained back-to-back
// navigation + axe-scan load, occasionally takes longer than that for a
// first request against a route it hasn't served recently (verified live:
// a `job-detail` heading missed a 5s window on an otherwise-passing run) —
// passed explicitly to every "did the view finish loading" assertion below.
const LONG: { timeout: number } = { timeout: 20_000 };

// Candidate card's own root class (see candidate-card.tsx) — same selector
// board.spec.ts/demo.spec.ts use, always scoped to a specific container by
// the caller so it never picks up an unrelated element.
const CARD_SELECTOR = ".rounded-lg.border.border-border.bg-surface.p-3";

function shotPath(view: string, theme: Theme, vp: string): string {
  return path.join(SCREENSHOT_DIR, `${view}-${theme}-${vp}.png`);
}

/** Sets the theme cookie in the browser context — must run before the next `page.goto`, which is what actually applies it (see theme-script.tsx: it reads the cookie once, at initial document load). */
async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.context().addCookies([
    { name: THEME_COOKIE, value: theme, url: "http://localhost:3000" },
  ]);
}

/**
 * Retries a view's `setup()` (a fresh `page.goto` plus its own load
 * assertion) up to `attempts` times. This machine's dev server, under this
 * matrix's sustained back-to-back navigation + axe-scan load, occasionally
 * drops a client-side hydration entirely on one navigation — the server
 * still returns the page shell (200, logged), but the client never issues
 * its own data fetch, so the "did content load" assertion times out even at
 * `LONG`'s 20s (verified live: `dev.log` showed the `GET /jobs 200` and
 * nothing after it — no subsequent `GET /api/jobs` — for the exact
 * navigation that hung, on an otherwise fully passing run). Re-running
 * `setup()` is a *fresh* `page.goto`, a brand-new document/JS realm, not a
 * retry of the same stuck state — this recovers a real environment flake
 * without masking an actual violation (axe only ever runs after `setup`
 * resolves, so a genuine a11y problem still fails the assertion, retries or
 * not).
 */
async function withRetry(setup: () => Promise<void>, attempts = 3): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await setup();
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

/**
 * `enterDemo()` (helpers.ts) itself can hit the same hydration stall
 * `withRetry` above works around — but a naive retry there would re-click
 * "View Live Demo" and burn a second rate-limited `POST /api/demo/start`
 * even when the first click's request actually reached the server (session
 * cookie set) and only the client-side `router.push("/dashboard")` never
 * ran. This checks `/api/users/me` (same cookie jar) before retrying: a 200
 * means the session already exists, so it just navigates to `/dashboard`
 * directly instead of spending another of the 5/hour budget.
 */
async function ensureDemo(page: Page, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await enterDemo(page);
      return;
    } catch (err) {
      const me = await page.request.get("/api/users/me");
      if (me.ok()) {
        await page.goto("/dashboard");
        return;
      }
      if (i === attempts - 1) throw err;
    }
  }
}

/**
 * The brief's axe assertion, verbatim — run inside a named `test.step` (not
 * a custom failure-message label) so a violation's trace still identifies
 * which view/theme it came from without changing the assertion itself.
 */
async function runAxe(page: Page, label: string): Promise<void> {
  await test.step(`axe: ${label}`, async () => {
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

interface ViewCtx {
  jobId: string;
}

type ViewSetup = (page: Page, ctx: ViewCtx) => Promise<void>;

// Visitable signed-out — must run *before* `enterDemo()` establishes a
// session: `/login` redirects a signed-in visitor straight to `/dashboard`
// (see app/(auth)/layout.tsx), so there is no way to screenshot it once
// authenticated.
const UNAUTH_VIEWS: Record<string, ViewSetup> = {
  landing: async (page) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "View Live Demo" })).toBeVisible(LONG);
  },
  login: async (page) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible(LONG);
  },
};

const AUTH_VIEWS: Record<string, ViewSetup> = {
  dashboard: async (page) => {
    await page.goto("/dashboard");
    await expect(page.locator("p.tabular-nums")).toHaveCount(4, LONG);
  },
  jobs: async (page) => {
    await page.goto("/jobs");
    await expect(page.locator('a[href^="/jobs/"]').first()).toBeVisible(LONG);
  },
  "job-detail": async (page, ctx) => {
    await page.goto(`/jobs/${ctx.jobId}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible(LONG);
  },
  "candidates-board": async (page) => {
    await page.goto("/candidates");
    await expect(page.locator(CARD_SELECTOR).first()).toBeVisible(LONG);
  },
  "candidates-table": async (page) => {
    await page.goto("/candidates");
    await expect(page.locator(CARD_SELECTOR).first()).toBeVisible(LONG);
    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible(LONG);
  },
  "candidate-drawer": async (page) => {
    await page.goto("/candidates");
    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).toBeVisible(LONG);
    await firstCard.locator("button").first().click();
    const drawer = page.getByRole("dialog");
    // Two <h2>s live in the loaded drawer — Radix's own dialog title
    // (candidate-drawer.tsx's `<Drawer title={candidate.name}>`) and the
    // drawer body's own visual heading, both showing the candidate's name.
    // .first() just needs either one, as proof the drawer finished loading
    // (vs. still showing CandidateDrawerSkeleton, which has no <h2> at all).
    await expect(drawer.locator("h2").first()).toBeVisible(LONG);
  },
  "add-candidate": async (page) => {
    await page.goto("/candidates");
    await expect(page.locator(CARD_SELECTOR).first()).toBeVisible(LONG);
    await page.getByRole("button", { name: "Add candidate" }).click();
    const dialog = page.getByRole("dialog", { name: "Add candidate" });
    await expect(dialog.getByText("Drop a resume here, or click to browse")).toBeVisible(LONG);
  },
  analytics: async (page) => {
    await page.goto("/analytics");
    await expect(page.locator("p.tabular-nums")).toHaveCount(4, LONG);
  },
  settings: async (page) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible(LONG);
    await expect(page.locator("tbody tr").first()).toBeVisible(LONG);
  },
};

test.describe("visual audit", () => {
  // Disables framer-motion transitions (useReducedMotion) and the global
  // prefers-reduced-motion CSS collapse in app/globals.css, so every
  // screenshot captures a settled end-state rather than a mid-transition
  // frame (drawer slide, dialog fade/scale, Recharts' own isAnimationActive
  // gate in charts.tsx) — deterministic pixels, not a design change.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("screenshots every view x theme x viewport and finds zero axe violations", async ({ page }) => {
    // 44 screenshots + 22 axe scans in one test is legitimately slow, and
    // this machine's dev server recompiles routes on-demand under sustained
    // load (see task-32-report.md) — generous headroom over Playwright's
    // 5s-default per-assertion timeout avoids a slow-but-real render being
    // mistaken for a failure.
    test.setTimeout(300_000);
    page.setDefaultTimeout(30_000);

    // --- Phase 1: signed-out views (landing, login) ---
    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        for (const [view, setup] of Object.entries(UNAUTH_VIEWS)) {
          await withRetry(() => setup(page, { jobId: "" }));
          await page.screenshot({ path: shotPath(view, theme, vp.vp), fullPage: true });
          if (vp.vp === "desktop") await runAxe(page, `${view} / ${theme}`);
        }
      }
    }

    // --- One demo session for the whole file (POST /api/demo/start is
    // rate-limited to 5/hour per IP — see helpers.ts's enterDemo doc
    // comment) — every authenticated view below reuses it. ---
    await ensureDemo(page);
    const jobsRes = await page.request.get("/api/jobs");
    const jobs = (await jobsRes.json()) as Array<{ id: string }>;
    if (jobs.length === 0) throw new Error("Seeded demo workspace has no jobs — job-detail view has nothing to visit");
    const ctx: ViewCtx = { jobId: jobs[0].id };

    // --- Phase 2: authenticated views ---
    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const vp of VIEWPORTS) {
        await page.setViewportSize(vp);
        for (const [view, setup] of Object.entries(AUTH_VIEWS)) {
          await withRetry(() => setup(page, ctx));
          await page.screenshot({ path: shotPath(view, theme, vp.vp), fullPage: true });
          if (vp.vp === "desktop") await runAxe(page, `${view} / ${theme}`);
        }
      }
    }
  });
});
