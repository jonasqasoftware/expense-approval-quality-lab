import { test, expect } from "../../playwright/fixtures/api.js";
import { accounts } from "../../playwright/fixtures/accounts.js";

/**
 * S1 — the only scenario that exercises the login form itself: it is part of
 * this journey's real story (an employee arrives, signs in, submits an
 * expense) — see docs/TEST_STRATEGY.md, "Authentication".
 *
 * The title includes the running project's name because this same scenario
 * also runs on the mobile-critical project against the same shared database
 * (see docs/TEST_STRATEGY.md, "Mobile") — that keeps the row this test just
 * created unambiguous, without relying on row order or a positional locator.
 */
test("employee logs in and submits a valid expense", async ({ page }, testInfo) => {
  const title = `Airport taxi — ${testInfo.project.name}`;

  await page.goto("/");

  await page.getByLabel("Email").fill(accounts.employeeA.email);
  await page.getByLabel("Password").fill(accounts.employeeA.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText(`Signed in as ${accounts.employeeA.name}`)).toBeVisible();

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Amount").fill("64.90");
  await page.getByLabel("Category").fill("Travel");
  await page.getByRole("button", { name: "Submit expense" }).click();

  const row = page.getByRole("row", { name: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText("pending");
});
