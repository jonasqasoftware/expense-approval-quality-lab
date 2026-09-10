import { test as setup, expect, type Page } from "@playwright/test";
import { accounts, type SeedAccount } from "../../playwright/fixtures/accounts.js";

/**
 * Logs in once per role through the real UI and saves the resulting session so
 * the rest of the E2E suite can start already authenticated via storageState,
 * instead of repeating a UI login before every test. See docs/TEST_STRATEGY.md,
 * "Authentication".
 */
async function loginAndSave(page: Page, account: SeedAccount, path: string) {
  await page.goto("/");
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(`Conectado como ${account.displayName}`)).toBeVisible();
  await page.context().storageState({ path });
}

setup("autentica como colaborador", async ({ page }) => {
  await loginAndSave(page, accounts.employeeA, "playwright/.auth/employee.json");
});

setup("autentica como gestor", async ({ page }) => {
  await loginAndSave(page, accounts.managerA, "playwright/.auth/manager.json");
});
