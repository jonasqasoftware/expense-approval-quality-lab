import { test, expect } from "../../playwright/fixtures/api.js";

/**
 * S8 — proves the UI respects the expense's state machine: once a decision is
 * made, the owner's Edit control simply is not offered. Lower priority than
 * S1/S3 (see docs/TEST_STRATEGY.md scenario table) but cheap to keep automated.
 */
test.use({ storageState: "playwright/.auth/employee.json" });

test("an already-decided expense cannot be edited by its owner", async ({ page, employeeApi, managerApi }) => {
  const created = await employeeApi.post("/api/expenses", {
    data: { title: "Decided expense for edit check", amount: 30, category: "Meals" },
  });
  const { expense } = await created.json();

  const decision = await managerApi.post(`/api/expenses/${expense.id}/approve`);
  expect(decision.status()).toBe(200);

  await page.goto("/");

  const row = page.getByRole("row", { name: /Decided expense for edit check/ });
  await expect(row).toContainText("approved");
  await expect(row.getByRole("button", { name: "Edit" })).toHaveCount(0);
});
