import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers";

// Only <p class="tabular-nums"> on /dashboard is KpiTile's value paragraph
// (src/components/dashboard/kpi-tile.tsx) — every other "tabular-nums" user
// in the app is a <span>, and none of them render on this route. See
// task-31-report.md for the fuller survey.
const KPI_VALUE_SELECTOR = "p.tabular-nums";

// The candidate card's own root class, scoped to a stage column below so it
// never picks up an unrelated element (see candidate-card.tsx).
const CARD_SELECTOR = ".rounded-lg.border.border-border.bg-surface.p-3";

test.describe("demo mode", () => {
  test("dashboard KPIs are non-zero, the board renders all 5 stages with cards, and the demo banner is visible", async ({
    page,
  }) => {
    await enterDemo(page);

    const kpiValues = page.locator(KPI_VALUE_SELECTOR);
    await expect(kpiValues).toHaveCount(4);
    for (const text of await kpiValues.allTextContents()) {
      expect(Number(text.replace(/,/g, ""))).toBeGreaterThan(0);
    }

    // Demo banner + role switcher, visible on every authenticated page.
    await expect(page.getByText("Demo workspace — data resets automatically")).toBeVisible();
    await expect(page.getByLabel("Viewing as:")).toBeVisible();

    await page.goto("/candidates");

    for (const stage of ["Applied", "Screening", "Interview", "Offer", "Hired"]) {
      const heading = page.getByRole("heading", { name: new RegExp(`^${stage}`) });
      await expect(heading).toBeVisible();
      const column = page.locator("li", { has: heading });
      await expect(column.locator(CARD_SELECTOR).first()).toBeVisible();
    }
  });
});
