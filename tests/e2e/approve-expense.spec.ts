import { test, expect } from "../../playwright/fixtures/api.js";

/**
 * S3 — the second half of the critical journey. Data is prepared via API
 * (the point of this test is the approval, not re-proving expense creation —
 * see docs/TEST_STRATEGY.md, "API vs E2E") and the session comes from
 * storageState, not a fresh UI login — see "Authentication".
 *
 * The title includes the running project's name because this same scenario
 * also runs on the mobile-critical project against the same shared database
 * (see docs/TEST_STRATEGY.md, "Mobile") — that keeps the row this test
 * created unambiguous, without relying on row order or a positional locator.
 */
test.use({ storageState: "playwright/.auth/manager.json" });

test("manager approves a pending expense and sees the status update", async ({ page, employeeApi }, testInfo) => {
  const title = `Client site visit — ${testInfo.project.name}`;

  const created = await employeeApi.post("/api/expenses", {
    data: { title, amount: 210, category: "Travel" },
  });
  expect(created.status()).toBe(201);

  await page.goto("/");

  const row = page.getByRole("row", { name: title });
  await expect(row).toContainText("pending");

  await row.getByRole("button", { name: "Approve" }).click();

  await expect(row).toContainText("approved");
});
