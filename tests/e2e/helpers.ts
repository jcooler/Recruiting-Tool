import type { Page } from "@playwright/test";

/**
 * Starts a fresh, isolated demo session and lands on `/dashboard` — the
 * same path a real visitor takes via the landing page's primary CTA (see
 * `src/components/marketing/landing.tsx`'s `useHeroCta`). Every call seeds a
 * brand-new demo workspace server-side (`startDemo()` in `src/lib/demo.ts`),
 * so calls never share state across tests — but `POST /api/demo/start` is
 * rate-limited to 5 requests/hour per IP (`RATE_LIMITS.demo`, see
 * `src/lib/rate-limit.ts`), so specs that need demo mode call this once per
 * spec file (see `playwright.config.ts`'s `workers: 1` note), not once per
 * test.
 */
export async function enterDemo(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "View Live Demo" }).click();
  await page.waitForURL("**/dashboard");
}

/** Collision-free username/email stem for signup tests. */
export function uniqueUser(): string {
  return `u${Date.now()}`;
}
