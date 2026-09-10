import { test, expect } from "../../playwright/fixtures/api.js";

/**
 * S8 — proves the UI respects the expense's state machine: once a decision is
 * made, the owner's Edit control simply is not offered. Lower priority than
 * S1/S3 (see docs/TEST_STRATEGY.md scenario table) but cheap to keep automated.
 */
test.use({ storageState: "playwright/.auth/employee.json" });

test("uma despesa já decidida não pode ser editada pelo dono", async ({ page, employeeApi, managerApi }) => {
  const created = await employeeApi.post("/api/expenses", {
    data: { title: "Despesa decidida para checagem de edição", amount: 30, category: "Meals" },
  });
  const { expense } = await created.json();

  const decision = await managerApi.post(`/api/expenses/${expense.id}/approve`);
  expect(decision.status()).toBe(200);

  await page.goto("/");

  const row = page.getByRole("row", { name: /Despesa decidida para checagem de edição/ });
  await expect(row).toContainText("Aprovada");
  await expect(row.getByRole("button", { name: "Editar" })).toHaveCount(0);
});
