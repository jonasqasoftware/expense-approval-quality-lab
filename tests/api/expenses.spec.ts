import { test, expect } from "../../playwright/fixtures/api.js";

test.describe("S2 — expense creation validates amount", () => {
  test("an amount of zero or less is rejected", async ({ employeeApi }) => {
    const response = await employeeApi.post("/api/expenses", {
      data: { title: "Broken laptop charger", amount: 0, category: "Equipment" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(/positive number/);
  });

  test("a valid amount is accepted", async ({ employeeApi }) => {
    const response = await employeeApi.post("/api/expenses", {
      data: { title: "Conference ticket", amount: 350, category: "Training" },
    });
    expect(response.status()).toBe(201);
    const { expense } = await response.json();
    expect(expense.status).toBe("pending");
  });
});

test.describe("S4 — a manager cannot decide their own expense", () => {
  test("approval of a self-submitted expense is blocked", async ({ managerApi }) => {
    const created = await managerApi.post("/api/expenses", {
      data: { title: "Manager's own travel", amount: 200, category: "Travel" },
    });
    const { expense } = await created.json();

    const approval = await managerApi.post(`/api/expenses/${expense.id}/approve`);
    expect(approval.status()).toBe(403);
    expect((await approval.json()).error).toMatch(/cannot decide their own/);
  });
});

test.describe("S5 — only a manager may decide an expense", () => {
  test("an employee calling the approval endpoint is rejected", async ({ employeeApi, managerApi }) => {
    const created = await employeeApi.post("/api/expenses", {
      data: { title: "Team lunch", amount: 80, category: "Meals" },
    });
    const { expense } = await created.json();

    const attempt = await employeeApi.post(`/api/expenses/${expense.id}/approve`);
    expect(attempt.status()).toBe(403);
    expect((await attempt.json()).error).toMatch(/only a manager/);

    // Clean assertion that the record is untouched by the rejected attempt.
    const still = await managerApi.get("/api/expenses");
    const record = (await still.json()).expenses.find((e: { id: number }) => e.id === expense.id);
    expect(record.status).toBe("pending");
  });
});

test.describe("S7 — expense listing is scoped by role", () => {
  test("an employee sees only their own expenses", async ({ employeeApi }) => {
    const created = await employeeApi.post("/api/expenses", {
      data: { title: "Employee scoped expense", amount: 42, category: "Supplies" },
    });
    const { expense: own } = await created.json();

    const response = await employeeApi.get("/api/expenses");
    const { expenses } = await response.json();

    expect(expenses.some((e: { id: number }) => e.id === own.id)).toBe(true);
    expect(expenses.every((e: { userId: number }) => e.userId === own.userId)).toBe(true);
  });

  test("a manager does not see expenses from a team they do not manage", async ({
    employeeApi,
    managerApi,
    otherManagerApi,
  }) => {
    const created = await employeeApi.post("/api/expenses", {
      data: { title: "Only manager-a's team should see this", amount: 15, category: "Supplies" },
    });
    const { expense } = await created.json();

    const ownTeamView = await managerApi.get("/api/expenses");
    const ownIds = ((await ownTeamView.json()).expenses as { id: number }[]).map((e) => e.id);
    expect(ownIds).toContain(expense.id);

    const otherTeamView = await otherManagerApi.get("/api/expenses");
    const otherIds = ((await otherTeamView.json()).expenses as { id: number }[]).map((e) => e.id);
    expect(otherIds).not.toContain(expense.id);
  });

  test("a manager outside the reporting line cannot approve the expense either", async ({
    employeeApi,
    otherManagerApi,
  }) => {
    const created = await employeeApi.post("/api/expenses", {
      data: { title: "Cross-team approval attempt", amount: 15, category: "Supplies" },
    });
    const { expense } = await created.json();

    const attempt = await otherManagerApi.post(`/api/expenses/${expense.id}/approve`);
    expect(attempt.status()).toBe(403);
    expect((await attempt.json()).error).toMatch(/does not manage/);
  });
});
