export type UserRole = "employee" | "manager";

export type ExpenseStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  /** The manager allowed to approve/reject this user's expenses. Null for top-level managers. */
  managerId: number | null;
}

export interface Expense {
  id: number;
  userId: number;
  title: string;
  amount: number;
  category: string;
  status: ExpenseStatus;
  reason: string | null;
  decidedBy: number | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  category: string;
}

export interface UpdateExpenseInput {
  title?: string;
  amount?: number;
  category?: string;
}
