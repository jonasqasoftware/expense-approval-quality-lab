import { test as base, request, type APIRequestContext } from "@playwright/test";
import { accounts, type SeedAccount } from "./accounts.js";

async function loginAs(baseURL: string, account: SeedAccount): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL });
  const response = await ctx.post("/api/auth/login", {
    data: { email: account.email, password: account.password },
  });
  if (!response.ok()) {
    throw new Error(`login as ${account.email} failed: ${response.status()} ${await response.text()}`);
  }
  return ctx;
}

interface ApiFixtures {
  /** Authenticated as employee-a — owns expenses managed by managerA. */
  employeeApi: APIRequestContext;
  /** Authenticated as manager-a — manages employee-a. */
  managerApi: APIRequestContext;
  /** Authenticated as manager-b — manages employee-b, NOT employee-a. Used to prove cross-team isolation (S7). */
  otherManagerApi: APIRequestContext;
}

export const test = base.extend<ApiFixtures>({
  employeeApi: async ({ baseURL }, use) => {
    const ctx = await loginAs(baseURL!, accounts.employeeA);
    await use(ctx);
    await ctx.dispose();
  },
  managerApi: async ({ baseURL }, use) => {
    const ctx = await loginAs(baseURL!, accounts.managerA);
    await use(ctx);
    await ctx.dispose();
  },
  otherManagerApi: async ({ baseURL }, use) => {
    const ctx = await loginAs(baseURL!, accounts.managerB);
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from "@playwright/test";
