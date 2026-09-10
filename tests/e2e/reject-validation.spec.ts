import { test, expect } from "../../playwright/fixtures/api.js";

/**
 * S6 — this is the one rule that can only be observed in the UI: the form
 * must block submission client-side when the reason is empty (the API also
 * enforces this — see tests/api — this test proves the UI's own defense, not
 * the API's, per docs/TEST_STRATEGY.md, "API vs E2E").
 */
test.use({ storageState: "playwright/.auth/manager.json" });

test("rejecting without a reason is blocked in the form", async ({ page, employeeApi }) => {
  const created = await employeeApi.post("/api/expenses", {
    data: { title: "Unjustified software license", amount: 99, category: "Software" },
  });
  expect(created.status()).toBe(201);

  await page.goto("/");

  const row = page.getByRole("row", { name: /Unjustified software license/ });
  await row.getByRole("button", { name: "Reject" }).click();
  await row.getByRole("button", { name: "Confirm rejection" }).click();

  await expect(row.getByRole("alert")).toHaveText("Reason is required to reject an expense.");
  await expect(row).toContainText("pending");
});
