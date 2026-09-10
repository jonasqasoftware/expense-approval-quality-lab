import { Router, type Request, type Response } from "express";
import type { Db } from "../db/index.js";
import { canDecide, canEdit, scopeExpensesForActor, validateCreateExpense, validateRejectionReason } from "../domain/rules.js";
import { requireAuth } from "../middleware/auth.js";

export function expensesRouter(db: Db): Router {
  const router = Router();
  router.use(requireAuth(db));

  router.get("/", (req, res) => {
    const users = db.listUsers();
    const scoped = scopeExpensesForActor(req.user!, db.listExpenses(), users);
    res.json({ expenses: scoped });
  });

  router.post("/", (req, res) => {
    const input = req.body as { title?: string; amount?: number; category?: string };
    const validation = validateCreateExpense({
      title: input.title ?? "",
      amount: Number(input.amount),
      category: input.category ?? "",
    });
    if (!validation.ok) {
      res.status(validation.status).json({ error: validation.error });
      return;
    }
    const expense = db.insertExpense(req.user!.id, input.title!.trim(), Number(input.amount), input.category!.trim());
    res.status(201).json({ expense });
  });

  router.patch("/:id", (req, res) => {
    const expense = db.findExpenseById(Number(req.params.id));
    if (!expense) {
      res.status(404).json({ error: "expense not found" });
      return;
    }
    const permission = canEdit(req.user!, expense);
    if (!permission.ok) {
      res.status(permission.status).json({ error: permission.error });
      return;
    }
    const input = req.body as { title?: string; amount?: number; category?: string };
    if (input.amount !== undefined && (typeof input.amount !== "number" || input.amount <= 0)) {
      res.status(400).json({ error: "amount must be a positive number" });
      return;
    }
    db.updateExpenseFields(expense.id, input);
    res.json({ expense: db.findExpenseById(expense.id) });
  });

  router.post("/:id/approve", (req, res) => {
    decide(req, res, "approved", null);
  });

  router.post("/:id/reject", (req, res) => {
    const { reason } = req.body as { reason?: string };
    const reasonCheck = validateRejectionReason(reason);
    if (!reasonCheck.ok) {
      res.status(reasonCheck.status).json({ error: reasonCheck.error });
      return;
    }
    decide(req, res, "rejected", reason!.trim());
  });

  function decide(req: Request, res: Response, status: "approved" | "rejected", reason: string | null) {
    const expense = db.findExpenseById(Number(req.params.id));
    if (!expense) {
      res.status(404).json({ error: "expense not found" });
      return;
    }
    const owner = db.findUserById(expense.userId);
    if (!owner) {
      res.status(404).json({ error: "expense owner not found" });
      return;
    }
    const permission = canDecide(req.user!, expense, owner);
    if (!permission.ok) {
      res.status(permission.status).json({ error: permission.error });
      return;
    }
    db.decideExpense(expense.id, status, req.user!.id, reason);
    res.json({ expense: db.findExpenseById(expense.id) });
  }

  return router;
}
