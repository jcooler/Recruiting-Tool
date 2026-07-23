import { test, expect } from "@playwright/test";
import { uniqueUser } from "./helpers";

test.describe("auth", () => {
  test("signup lands on the dashboard, logout returns to the landing page, and login round-trips back", async ({
    page,
  }) => {
    const user = uniqueUser();
    const username = user;
    const email = `${user}@example.com`;
    const password = "correct-horse-battery-9";

    await page.goto("/signup");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveTitle(/Dashboard/);

    // Log out via the topbar account menu — returns to the (signed-out) landing page.
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();

    await page.waitForURL("http://localhost:3000/");
    await expect(page.getByRole("button", { name: "View Live Demo" })).toBeVisible();

    // Round-trip: log back in with the same credentials.
    await page.goto("/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveTitle(/Dashboard/);
  });

  test("a wrong password shows 'Invalid credentials' and stays on the login page", async ({ page }) => {
    // A fresh, known-good account so this test doesn't depend on seed data
    // existing (or its password) — only that signup succeeded just now.
    const user = uniqueUser();
    const username = user;
    const email = `${user}@example.com`;
    const password = "correct-horse-battery-9";

    await page.goto("/signup");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard");

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL("http://localhost:3000/");

    await page.goto("/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Scoped past text, not just role: Next's route announcer
    // (`#__next-route-announcer__`) is also `role="alert"` on every page.
    await expect(page.getByRole("alert").filter({ hasText: "Invalid credentials" })).toHaveText(
      "Invalid credentials"
    );
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("visiting /dashboard while signed out redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
  });
});
