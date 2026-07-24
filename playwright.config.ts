/**
 * Playwright e2e config.
 *
 * REQUIRES A REAL MONGODB. This suite drives the actual dev server (see
 * `webServer` below), which connects via `MONGODB_URI` exactly like
 * production/dev does (`src/lib/db.ts` / `src/lib/env.ts`) — there is no
 * mock or in-memory substitution inside the app itself. `MONGODB_URI` can
 * point at anything reachable: a local `mongod`, `mongodb-memory-server`, or
 * an Atlas dev database — whatever is present in the environment that starts
 * `npm run dev` (and `npm run seed`, if you want the demo workspace
 * pre-seeded rather than created lazily via "View Live Demo") is what the
 * app uses. This config never reads or writes `.env.local` itself.
 *
 * Offline dev note (written during a machine-wide DNS outage that made the
 * `.env.local` Atlas URI unreachable): the fallback used to develop and run
 * this suite was a local `mongodb-memory-server` instance on a fixed port,
 * started in a separate process, with `MONGODB_URI` overridden in the shell
 * environment before `npm run dev` ran — see `.superpowers/sdd/task-31-report.md`
 * for the exact commands. `reuseExistingServer: true` below is what lets that
 * separately-started, separately-seeded dev server be reused as-is instead of
 * this config spawning its own (which would come up against the same
 * unreachable-Atlas `.env.local` default).
 *
 * `workers: 1` — several specs call `enterDemo()` (POST /api/demo/start),
 * which is rate-limited to 5 requests/hour per IP (RATE_LIMITS.demo, see
 * src/lib/rate-limit.ts) and keyed by client IP, which every local Chromium
 * request resolves to the same "local" bucket (src/lib/with-auth.ts's
 * `clientIp`) regardless of which worker sent it. Running workers serially
 * keeps the total call count exactly equal to the number of specs that call
 * it, with no risk of parallel workers racing each other's budget.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    // touch.spec.ts is touch-only (page.tap() throws without hasTouch), so the
    // mouse-profile project must skip it; every other spec stays mouse-profile.
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: "**/touch.spec.ts" },
    // Real touch emulation (hasTouch + touch-derived pointer events), not a
    // resized desktop viewport — the two pipelines diverge exactly where the
    // task-33c-era blackout lived (see tests/e2e/touch.spec.ts). browserName
    // overrides the descriptor's webkit default: the bug's habitat is Chrome
    // DevTools device emulation, and chromium is the only browser installed.
    { name: "touch", use: { ...devices["iPhone 14"], browserName: "chromium" }, testMatch: "**/touch.spec.ts" },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
