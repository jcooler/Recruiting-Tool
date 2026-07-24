import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers";

// The candidate card's own root class — same scoped selector board.spec.ts uses.
const CARD_SELECTOR = ".rounded-lg.border.border-border.bg-surface.p-3";

/**
 * Touch-emulation pin for the device-emulation blackout (2026-07-24, handoff
 * §1). Runs ONLY under the `touch` project in playwright.config.ts (iPhone 14
 * descriptor: `hasTouch`, touch-derived pointer events, mobile viewport).
 *
 * The regression this pins: opening any Radix modal layer (the card's actions
 * menu here) mounts react-remove-scroll-bar's scroll lock, which compensates
 * for a "disappearing body scrollbar" with
 * `body[data-scroll-locked] { margin-right: <gap>px !important }` where
 * `gap = window.innerWidth - documentElement.clientWidth`. Under device
 * emulation (Chrome DevTools device toolbar, Playwright device descriptors)
 * `window.innerWidth` can transiently report the un-emulated host-window
 * width, so the gap computes to hundreds of pixels, body's border-box
 * collapses to 0 width, and the overflow-hidden app shell clips the entire
 * app to nothing — "the whole app goes black behind the menu items". The
 * menu itself survives because Radix's popper wrapper is position:fixed.
 *
 * Mouse-profile runs can never catch this (desktop innerWidth matches
 * clientWidth), and screenshot/axe audits at emulated sizes missed it because
 * overflow-clipped elements still report non-empty bounding boxes to
 * `toBeVisible()`. Hence the computed-style assertions below: they pin the
 * failure MECHANISM (body margin/width), not just element visibility.
 * globals.css neutralizes the compensation (`html body[data-scroll-locked]`),
 * which is safe app-wide because every surface that can open a modal layer
 * lives inside the h-screen/overflow-hidden app shell where body never
 * scrolls.
 */
test.describe("touch: pipeline board card menu", () => {
  test("tapping a card's actions menu keeps the app painted, and the menu works", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/candidates");

    const card = page.locator(CARD_SELECTOR).first();
    const name = (await card.locator("button").first().innerText()).trim();

    // --- the gesture: TAP (touch pipeline), not click ---
    await card.getByRole("button", { name: `Actions for ${name}` }).tap();
    await expect(page.getByRole("menuitem", { name: "Move to" })).toBeVisible();

    // --- the blackout invariant: body must not collapse while the modal
    // menu's scroll lock is active ---
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport");
    const body = await page.evaluate(() => ({
      width: document.body.getBoundingClientRect().width,
      marginRight: getComputedStyle(document.body).marginRight,
    }));
    expect(body.marginRight).toBe("0px");
    expect(body.width).toBe(viewport.width);

    // --- menu is functional under touch: View profile opens the drawer ---
    await page.getByRole("menuitem", { name: "View profile" }).tap();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    // Same invariant while the drawer's own (Radix Dialog) scroll lock holds.
    const bodyWithDrawer = await page.evaluate(() => document.body.getBoundingClientRect().width);
    expect(bodyWithDrawer).toBe(viewport.width);

    // --- close, then reopen the menu: the task-33c stale-?candidate= guard
    // must hold under touch too (drawer stays closed behind the menu) ---
    await page.getByRole("button", { name: "Close panel" }).tap();
    await expect(drawer).not.toBeVisible();

    await card.getByRole("button", { name: `Actions for ${name}` }).tap();
    await expect(page.getByRole("menuitem", { name: "View profile" })).toBeVisible();
    await expect(drawer).not.toBeVisible();
  });
});
