import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers";

const CARD_SELECTOR = ".rounded-lg.border.border-border.bg-surface.p-3";

test.describe("role-based access control", () => {
  test("switching to Interviewer hides admin controls and disables drag, but the note composer still works", async ({
    page,
  }) => {
    await enterDemo(page); // demo sessions start as admin

    // --- Admin: edit controls are present, everywhere they're supposed to be ---
    await page.goto("/candidates");
    await expect(page.getByRole("button", { name: "Add candidate" })).toBeVisible();

    await page.getByRole("button", { name: "Search or jump to…" }).click();
    const palette = page.getByRole("dialog", { name: "Command menu" });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("option", { name: "Add candidate" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();

    await page.goto("/jobs");
    await expect(page.getByRole("button", { name: "New job" })).toBeVisible();

    // --- Switch to Interviewer via the demo banner's role switcher ---
    await page.goto("/candidates");
    await page.getByLabel("Viewing as:").selectOption("interviewer");
    await expect(page.getByLabel("Viewing as:")).toHaveValue("interviewer");

    await expect(page.getByRole("button", { name: "Add candidate" })).toHaveCount(0);

    await page.getByRole("button", { name: "Search or jump to…" }).click();
    await expect(palette).toBeVisible();
    // Known gap this spec closes: the command palette's "Add candidate" item
    // wasn't canEdit-gated even though the page button was (fixed in
    // src/components/shell/command-palette.tsx — see task-31-report.md).
    await expect(palette.getByRole("option", { name: "Add candidate" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.goto("/jobs");
    await expect(page.getByRole("button", { name: "New job" })).toHaveCount(0);

    // --- Drag disabled: no role="group" from dnd-kit on a read-only card ---
    // (candidate-card.tsx spreads dnd-kit's listeners/attributes — which is
    // where role="group" comes from, via useDraggable's `attributes: {
    // role: "group" }` override — only when canEdit is true. Matches
    // board.spec.ts:210's identical assertion for a rejected, read-only
    // card.)
    await page.goto("/candidates");
    const firstCard = page.locator(CARD_SELECTOR).first();
    await expect(firstCard).not.toHaveAttribute("role", "group");

    // --- Note composer: not canEdit-gated, works for every signed-in role ---
    const candidateName = (await firstCard.locator("button").first().innerText()).trim();
    await firstCard.locator("button").first().click();
    const drawer = page.getByRole("dialog", { name: candidateName });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("tab", { name: "Notes" }).click();

    const noteBody = `Interviewer feedback ${Date.now()}`;
    await drawer.getByLabel("Add a note").fill(noteBody);
    await drawer.getByRole("button", { name: "Add note" }).click();
    await expect(drawer.getByText(noteBody)).toBeVisible();
    await drawer.getByRole("button", { name: "Close panel" }).click();

    // --- Switch back to Admin: controls return ---
    await page.getByLabel("Viewing as:").selectOption("admin");
    await expect(page.getByLabel("Viewing as:")).toHaveValue("admin");
    await expect(page.getByRole("button", { name: "Add candidate" })).toBeVisible();
  });
});
