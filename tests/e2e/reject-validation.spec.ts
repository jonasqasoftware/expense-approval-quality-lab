import { test, expect } from "../../playwright/fixtures/api.js";

/**
 * S6 — this is the one rule that can only be observed in the UI: the form
 * must block submission client-side when the reason is empty (the API also
 * enforces this — see tests/api — this test proves the UI's own defense, not
 * the API's, per docs/TEST_STRATEGY.md, "API vs E2E").
 */
test.use({ storageState: "playwright/.auth/manager.json" });

test("rejeitar sem motivo é bloqueado no formulário", async ({ page, employeeApi }) => {
  const created = await employeeApi.post("/api/expenses", {
    data: { title: "Licença de software sem justificativa", amount: 99, category: "Software" },
  });
  expect(created.status()).toBe(201);

  await page.goto("/");

  const row = page.getByRole("row", { name: /Licença de software sem justificativa/ });
  await row.getByRole("button", { name: "Rejeitar" }).click();
  await row.getByRole("button", { name: "Confirmar rejeição" }).click();

  await expect(row.getByRole("alert")).toHaveText("O motivo é obrigatório para rejeitar uma despesa.");
  await expect(row).toContainText("Pendente");
});
