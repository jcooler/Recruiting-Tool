import { test, expect, type Page } from "@playwright/test";
import { enterDemo } from "./helpers";

/**
 * Pins task-32b's defect-1 fix (table-view.tsx): every body `<td>` must sit
 * at the exact same x-position as its column's `<th>`, at any scroll offset.
 * Before the fix, virtualized body rows were `position: absolute`, which
 * took them out of the real `<table>`'s formatting context — the shared
 * `<colgroup>` (COLUMN_WIDTHS) only ever reached the in-flow header row, so
 * body cells silently auto-sized to their own content instead. Comparing
 * `getBoundingClientRect().x` per column (header vs. the first body row's
 * cell in that column) with a ≤1px tolerance for subpixel rounding is a
 * layout-level assertion that regresses loudly if that ever comes back,
 * regardless of how the fix is implemented.
 */
async function assertColumnsAligned(page: Page): Promise<void> {
  const headers = page.locator("table thead th");
  const firstRowCells = page.locator("table tbody tr").first().locator("td");
  const headerCount = await headers.count();
  expect(await firstRowCells.count()).toBe(headerCount);
  for (let i = 0; i < headerCount; i++) {
    const headerBox = await headers.nth(i).boundingBox();
    const cellBox = await firstRowCells.nth(i).boundingBox();
    if (!headerBox || !cellBox) throw new Error(`column ${i} has no bounding box`);
    expect(Math.abs(headerBox.x - cellBox.x)).toBeLessThanOrEqual(1);
  }
}

test.describe("pipeline table view", () => {
  test("body cells stay aligned with their column headers, including under horizontal scroll", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/candidates");
    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.locator("table tbody tr").first()).toBeVisible();

    await assertColumnsAligned(page);

    // Force horizontal scroll: table-view.tsx's <table> carries a fixed
    // min-width (the sum of every COLUMN_WIDTHS entry) that's wider than a
    // narrow viewport, so the outer overflow-auto div gets a real
    // scrollbar — the exact case the brief calls out by name.
    await page.setViewportSize({ width: 480, height: 800 });
    await page.evaluate(() => {
      const scrollEl = document.querySelector("table")?.parentElement;
      if (scrollEl) scrollEl.scrollLeft = scrollEl.scrollWidth;
    });
    await assertColumnsAligned(page);
  });
});
