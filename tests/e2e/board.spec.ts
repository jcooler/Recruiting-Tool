import { test, expect, type Locator, type Page } from "@playwright/test";
import { enterDemo } from "./helpers";

// The candidate card's own root class (see candidate-card.tsx) — always
// scoped to a column locator below so it never picks up an unrelated element.
const CARD_SELECTOR = ".rounded-lg.border.border-border.bg-surface.p-3";

// All 5 stage columns side by side (see board-view.tsx) don't fit a default
// 1280px viewport without horizontal scrolling, which would put boundingBox()
// coordinates for later columns outside the visible viewport a real pointer
// drag needs to land in. A wide viewport keeps every column on-screen.
test.use({ viewport: { width: 1920, height: 1080 } });

function column(page: Page, stageLabel: string): Locator {
  const heading = page.getByRole("heading", { name: new RegExp(`^${stageLabel}`) });
  return page.locator("li", { has: heading });
}

/** First card's visible name in a column, via the card's own "open profile" name button. */
async function firstCardName(col: Locator): Promise<string> {
  const text = await col.locator(CARD_SELECTOR).first().locator("button").first().innerText();
  return text.trim();
}

/**
 * Presses Tab repeatedly (starting from whatever currently has focus —
 * callers should start from a fresh navigation/reload so that's "nothing",
 * putting the very first Tab on the page's first focusable element) until
 * `target` itself is `document.activeElement`, proving `target` is
 * actually reachable through the real tab order rather than merely
 * focus()-able. Fails loudly (rather than looping forever) if the target
 * is never reached, which is exactly what should happen if it ever drops
 * out of the tab order.
 */
async function tabUntilFocused(page: Page, target: Locator, maxPresses = 80): Promise<void> {
  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Tab traversal never reached the target element within ${maxPresses} presses`);
}

/**
 * Keyboard-picks-up `card` (Space), steps one column right (ArrowRight),
 * and drops (Space) — retrying the whole pickup if the step didn't
 * register. The card is reached via real `Tab` traversal (`tabUntilFocused`)
 * on the first attempt, per the task brief's "focus a card (Tab)" — a
 * retry (only reachable if the first attempt's *step*, not its focus,
 * failed — see below) re-focuses directly, since the card never lost
 * focus in the first place (dnd-kit's `Escape` cancels the drag, it
 * doesn't blur the node).
 *
 * @dnd-kit/core's KeyboardSensor only starts reporting real
 * `context.collisionRect` values once its own `status` state machine
 * reaches `Initialized`, which needs an extra render/layout pass beyond
 * the one that fires the live region's pickup announcement (see
 * `Status.Initializing` -> `Status.Initialized` in
 * `@dnd-kit/core/dist/core.esm.js`, gated on `activeNodeRect` becoming
 * non-null). An `ArrowRight` fired before that lands as a no-op in
 * `column-coordinates.ts`'s `coordinateGetter` (`if (!collisionRect)
 * return;`), and the card silently drops back into its starting column —
 * verified live, reproducibly, and *not* reliably fixed by any single
 * fixed delay before the key press (varied from immediate up to 1s across
 * live trials). Retrying the pickup — cancelling with Escape when a step
 * doesn't land — is the robust fix; a raw `waitForTimeout` isn't a
 * guaranteed bound on a React effect cascade.
 */
async function keyboardStepRight(
  page: Page,
  card: Locator,
  liveRegion: Locator,
  name: string,
  targetColumnLabel: string
): Promise<void> {
  await tabUntilFocused(page, card);
  for (let attempt = 0; attempt < 5; attempt++) {
    // Re-assert focus (not re-tab): the card still has it from the real Tab
    // traversal above (or from the previous attempt — Escape cancels the
    // drag, it doesn't move focus), so this is a same-element no-op except
    // on a genuine retry, where it re-confirms the precondition rather than
    // re-deriving reachability, which the first `tabUntilFocused` already
    // proved.
    await card.focus();
    await page.keyboard.press("Space");
    await expect(liveRegion).toContainText(name);
    await page.keyboard.press("ArrowRight");
    try {
      await expect(liveRegion).toContainText(`over the ${targetColumnLabel} column`, { timeout: 750 });
      await page.keyboard.press("Space");
      return;
    } catch {
      await page.keyboard.press("Escape"); // cancels this pickup; card stays put for the next attempt
    }
  }
  throw new Error(`keyboard drag never moved "${name}" into ${targetColumnLabel} after 5 attempts`);
}

test.describe("pipeline board drag interactions", () => {
  test("cards move via pointer drag (with reload persistence), keyboard drag, and the card menu", async ({
    page,
  }) => {
    await enterDemo(page);
    await page.goto("/candidates");

    const applied = column(page, "Applied");
    const interview = column(page, "Interview");
    const screening = column(page, "Screening");
    const offer = column(page, "Offer");

    // --- Pointer drag: Applied -> Interview, then verify it survives a reload ---
    const pointerCardName = await firstCardName(applied);
    const pointerCard = applied.locator(CARD_SELECTOR).first();
    const interviewBox = await interview.boundingBox();
    if (!interviewBox) throw new Error("Interview column has no bounding box");

    // The PATCH is fired from `onDragEnd` in the background while the UI
    // already shows the optimistic result (`useMoveStage`'s `onMutate`) —
    // without waiting for it to actually land, `page.reload()` below can
    // race ahead and abort the in-flight request before the server ever
    // sees it, which looks like a persistence bug but is really just the
    // test moving faster than the network.
    const [patchResponse] = await Promise.all([
      page.waitForResponse((res) => /\/api\/candidates\/[^/]+\/stage$/.test(res.url()) && res.request().method() === "PATCH"),
      (async () => {
        await pointerCard.hover();
        await page.mouse.down();
        await page.mouse.move(interviewBox.x + interviewBox.width / 2, interviewBox.y + interviewBox.height / 2, {
          steps: 12,
        });
        await page.mouse.up();
      })(),
    ]);
    expect(patchResponse.ok()).toBe(true);

    await expect(interview.getByText(pointerCardName, { exact: true })).toBeVisible();
    await expect(applied.getByText(pointerCardName, { exact: true })).toHaveCount(0);

    await page.reload();
    await expect(interview.getByText(pointerCardName, { exact: true })).toBeVisible();
    await expect(applied.getByText(pointerCardName, { exact: true })).toHaveCount(0);

    // --- Keyboard drag: real Tab traversal to the (new) first Applied card,
    // Space to pick up, ArrowRight to step one column right (Applied ->
    // Screening), Space to drop. `page.reload()` just above means focus
    // starts fresh (nothing focused), so the Tab traversal inside
    // `keyboardStepRight` below walks the page's real tab order from its
    // very first stop.
    const keyboardCardName = await firstCardName(applied);
    const keyboardCard = applied.locator(CARD_SELECTOR).first();
    // dnd-kit's own live region — id is "DndLiveRegion-<n>" (per-instance
    // suffix from useUniqueId, see @dnd-kit/core's Accessibility component),
    // scoped past the prefix because the page also has Next's route
    // announcer (`#__next-route-announcer__`), which is *also*
    // role="status"/aria-live="assertive" on every page.
    const liveRegion = page.locator('[id^="DndLiveRegion"]');

    await keyboardStepRight(page, keyboardCard, liveRegion, keyboardCardName, "Screening");

    await expect(liveRegion).toContainText("dropped into");
    await expect(screening.getByText(keyboardCardName, { exact: true })).toBeVisible();
    await expect(applied.getByText(keyboardCardName, { exact: true })).toHaveCount(0);

    // --- Menu path: card's "Actions" menu -> "Move to" -> "Offer" ---
    const menuCardName = await firstCardName(applied);
    const menuCard = applied.locator(CARD_SELECTOR).first();
    await menuCard.getByRole("button", { name: `Actions for ${menuCardName}` }).click();
    await page.getByRole("menuitem", { name: "Move to" }).click();
    await page.getByRole("menuitem", { name: "Offer" }).click();

    await expect(offer.getByText(menuCardName, { exact: true })).toBeVisible();
    await expect(applied.getByText(menuCardName, { exact: true })).toHaveCount(0);
  });
});
