import Database from "better-sqlite3";
import type { Expense, ExpenseStatus, User, UserRole } from "../domain/types.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    managerId INTEGER,
    passwordHash TEXT NOT NULL,
    passwordSalt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT,
    decidedBy INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    decidedAt TEXT
  );
`;

export interface UserRow {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  managerId: number | null;
  passwordHash: string;
  passwordSalt: string;
}

export type Db = ReturnType<typeof createDb>;

export function createDb(path: string) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);

  return {
    raw: db,

    insertUser(user: Omit<UserRow, "id">): number {
      const stmt = db.prepare(
        `INSERT INTO users (email, name, role, managerId, passwordHash, passwordSalt)
         VALUES (@email, @name, @role, @managerId, @passwordHash, @passwordSalt)`,
      );
      const result = stmt.run(user);
      return Number(result.lastInsertRowid);
    },

    findUserByEmail(email: string): UserRow | undefined {
      return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
    },

    findUserById(id: number): User | undefined {
      const row = db.prepare("SELECT id, email, name, role, managerId FROM users WHERE id = ?").get(id) as
        | User
        | undefined;
      return row;
    },

    listUsers(): User[] {
      return db.prepare("SELECT id, email, name, role, managerId FROM users").all() as User[];
    },

    insertExpense(userId: number, title: string, amount: number, category: string): Expense {
      const stmt = db.prepare(
        `INSERT INTO expenses (userId, title, amount, category) VALUES (?, ?, ?, ?)`,
      );
      const result = stmt.run(userId, title, amount, category);
      return this.findExpenseById(Number(result.lastInsertRowid))!;
    },

    findExpenseById(id: number): Expense | undefined {
      return db.prepare("SELECT * FROM expenses WHERE id = ?").get(id) as Expense | undefined;
    },

    listExpenses(): Expense[] {
      return db.prepare("SELECT * FROM expenses ORDER BY id DESC").all() as Expense[];
    },

    updateExpenseFields(id: number, fields: { title?: string; amount?: number; category?: string }): void {
      const current = this.findExpenseById(id);
      if (!current) return;
      const next = { ...current, ...fields };
      db.prepare(`UPDATE expenses SET title = ?, amount = ?, category = ? WHERE id = ?`).run(
        next.title,
        next.amount,
        next.category,
        id,
      );
    },

    decideExpense(id: number, status: Extract<ExpenseStatus, "approved" | "rejected">, decidedBy: number, reason: string | null): void {
      db.prepare(
        `UPDATE expenses SET status = ?, decidedBy = ?, reason = ?, decidedAt = datetime('now') WHERE id = ?`,
      ).run(status, decidedBy, reason, id);
    },
  };
}
