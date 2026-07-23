import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { test, expect } from "@playwright/test";
import { enterDemo } from "./helpers";

// Same fixture-generation approach as `makePdf` in tests/unit/api-resume.test.ts
// (duplicated, not imported — this file runs under Chromium via Playwright,
// not through Vitest, so it has no dependency on the vitest-only test tree).
async function makePdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let y = 700;
  for (const line of text.split("\n")) {
    page.drawText(line, { x: 40, y, size: 12, font });
    y -= 18;
  }
  return Buffer.from(await doc.save());
}

test.describe("resume parsing", () => {
  test("a parsed PDF prefills the add-candidate form, and the saved candidate's drawer shows the resume text", async ({
    page,
  }) => {
    // Written under the OS temp dir (not the repo), and removed afterwards —
    // this fixture is generated fresh per run, never a committed artifact.
    const dir = await mkdtemp(path.join(tmpdir(), "aw-e2e-resume-"));
    const fixturePath = path.join(dir, `${randomUUID()}.pdf`);
    try {
      const buf = await makePdf("Jane Doe\njane@example.com\n+1 555 123 4567\nSkills: React, TypeScript");
      await writeFile(fixturePath, buf);

      await enterDemo(page);
      await page.goto("/candidates");

      await page.getByRole("button", { name: "Add candidate" }).click();
      const dialog = page.getByRole("dialog", { name: "Add candidate" });
      await expect(dialog).toBeVisible();

      // "From resume" is the default tab — its dropzone wraps a real
      // (visually hidden) file input (see resume-dropzone.tsx).
      await dialog.locator('input[type="file"]').setInputFiles(fixturePath);

      await expect(dialog.getByText("Parsed from resume — review before saving")).toBeVisible();
      await expect(dialog.getByLabel("Name")).toHaveValue("Jane Doe");
      await expect(dialog.getByLabel("Email")).toHaveValue("jane@example.com");

      // jobId is required (src/lib/schemas/candidate.ts) but never prefilled
      // by the parse — pick the first real job (index 0 is the disabled
      // "Select a job…" placeholder).
      await dialog.getByLabel("Job").selectOption({ index: 1 });

      await dialog.getByRole("button", { name: "Add candidate" }).click();
      await expect(dialog).toBeHidden();

      // Saving opens the new candidate's drawer automatically.
      const drawer = page.getByRole("dialog", { name: "Jane Doe" });
      await expect(drawer).toBeVisible();
      await drawer.getByRole("tab", { name: "Resume" }).click();
      await expect(drawer.locator("pre")).toContainText("jane@example.com");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
