import { test, expect } from "../../playwright/fixtures/api.js";

test.describe("S2 — criação de despesa valida o valor", () => {
  test("um valor igual ou menor que zero é rejeitado", async ({ employeeApi }) => {
    const response = await employeeApi.post("/api/expenses", {
      data: { title: "Broken laptop charger", amount: 0, category: "Equipment" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(/positive number/);
  });

  test("um valor válido é aceito", async ({ employeeApi }) => {
    const response = await employeeApi.post("/api/expenses", {
      data: { title: "Conference ticket", amount: 350, category: "Training" },
    });
    expect(response.status()).toBe(201);
    const { expense } = await response.json();
    expect(expense.status).toBe("pending");
  });
});

test.describe("S4 — um gestor não pode decidir a própria despesa", () => {
  test("aprovação de uma despesa autossubmetida é bloqueada", async ({ managerApi }) => {
    const created = await managerApi.post("/api/expenses", {
      data: { title: "Manager's own travel", amount: 200, category: "Travel" },
    });
    const { expense } = await created.json();

    const approval = await managerApi.post(`/api/expenses/${expense.id}/approve`);
    expect(approval.status()).toBe(403);
    expect((await approval.json()).error).toMatch(/cannot decide their own/);
  });
});

test.describe("S5 — só um gestor pode decidir uma despesa", () => {
  test("um colaborador chamando o endpoint de aprovação é rejeitado", async ({ employeeApi, managerApi }) => {
    const created = await employeeApi.post("/api/expenses", {
      data: { title: "Team lunch", amount: 80, category: "Meals" },
    });
    const { expense } = await created.json();

    const attempt = await employeeApi.post(`/api/expenses/${expense.id}/approve`);
    expect(attempt.status()).toBe(403);
    expect((await attempt.json()).error).toMatch(/only a manager/);

    // Asserção limpa de que o registro permanece intocado pela tentativa rejeitada.
    const still = await managerApi.get("/api/expenses");
    const record = (await still.json()).expenses.find((e: { id: number }) => e.id === expense.id);
    expect(record.status).toBe("pending");
  });
});

test.describe("S7 — listagem de despesas com escopo por papel", () => {
  test("um colaborador vê somente as próprias despesas", async ({ employeeApi }) => {
    const created = await employeeApi.post("/api/expenses", {
      data: { title: "Employee scoped expense", amount: 42, category: "Supplies" },
    });
    const { expense: own } = await created.json();

    const response = await employeeApi.get("/api/expenses");
    const { expenses } = await response.json();

    expect(expenses.some((e: { id: number }) => e.id === own.id)).toBe(true);
    expect(expenses.every((e: { userId: number }) => e.userId === own.userId)).toBe(true);
  });

  test("um gestor não vê despesas de um time que não gerencia", async ({
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

  test("um gestor fora da linha de reporte também não pode aprovar a despesa", async ({
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
