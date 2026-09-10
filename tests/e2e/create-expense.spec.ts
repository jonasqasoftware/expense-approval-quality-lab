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
test("colaborador faz login e envia uma despesa válida", async ({ page }, testInfo) => {
  const title = `Táxi para o aeroporto — ${testInfo.project.name}`;

  await page.goto("/");

  await page.getByLabel("E-mail").fill(accounts.employeeA.email);
  await page.getByLabel("Senha").fill(accounts.employeeA.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByText(`Conectado como ${accounts.employeeA.displayName}`)).toBeVisible();

  await page.getByLabel("Título").fill(title);
  await page.getByLabel("Valor").fill("64.90");
  await page.getByLabel("Categoria").fill("Travel");
  await page.getByRole("button", { name: "Enviar despesa" }).click();

  const row = page.getByRole("row", { name: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Pendente");
});
