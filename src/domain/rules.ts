import type { CreateExpenseInput, Expense, User } from "./types.js";

export interface RuleFailure {
  ok: false;
  status: 400 | 403 | 404 | 409;
  error: string;
}

export interface RuleSuccess {
  ok: true;
}

export type RuleResult = RuleSuccess | RuleFailure;

/**
 * S2: amount must be a positive number. Title and category are required so a
 * request never becomes silently unreadable in the approval queue.
 */
export function validateCreateExpense(input: CreateExpenseInput): RuleResult {
  if (!input.title || !input.title.trim()) {
    return { ok: false, status: 400, error: "title is required" };
  }
  if (!input.category || !input.category.trim()) {
    return { ok: false, status: 400, error: "category is required" };
  }
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, status: 400, error: "amount must be a positive number" };
  }
  return { ok: true };
}

/**
 * S4 + S5 + S7's authorization half: a manager may decide an expense only when
 * they manage its owner, and — regardless of role — nobody may decide their own
 * expense (segregation of duties survives even a manager submitting for themselves).
 */
export function canDecide(actor: User, expense: Expense, owner: User): RuleResult {
  if (actor.role !== "manager") {
    return { ok: false, status: 403, error: "only a manager can decide an expense" };
  }
  if (expense.status !== "pending") {
    return { ok: false, status: 409, error: `expense is already ${expense.status}` };
  }
  if (expense.userId === actor.id) {
    return { ok: false, status: 403, error: "a manager cannot decide their own expense" };
  }
  if (owner.managerId !== actor.id) {
    return { ok: false, status: 403, error: "this manager does not manage the expense owner" };
  }
  return { ok: true };
}

/** S6: a rejection must always carry a non-empty reason, enforced server-side too. */
export function validateRejectionReason(reason: string | undefined): RuleResult {
  if (!reason || !reason.trim()) {
    return { ok: false, status: 400, error: "a reason is required to reject an expense" };
  }
  return { ok: true };
}

/** S8: only the owner may edit their expense, and only while it is still pending. */
export function canEdit(actor: User, expense: Expense): RuleResult {
  if (expense.userId !== actor.id) {
    return { ok: false, status: 403, error: "only the expense owner can edit it" };
  }
  if (expense.status !== "pending") {
    return { ok: false, status: 409, error: `expense is already ${expense.status} and can no longer be edited` };
  }
  return { ok: true };
}

/**
 * S7: an employee sees only their own expenses; a manager sees their own plus
 * those of the employees who report to them.
 */
export function scopeExpensesForActor(actor: User, expenses: Expense[], users: readonly User[]): Expense[] {
  if (actor.role === "employee") {
    return expenses.filter((expense) => expense.userId === actor.id);
  }

  const managedUserIds = new Set(
    users.filter((user) => user.managerId === actor.id).map((user) => user.id),
  );
  managedUserIds.add(actor.id);

  return expenses.filter((expense) => managedUserIds.has(expense.userId));
}
