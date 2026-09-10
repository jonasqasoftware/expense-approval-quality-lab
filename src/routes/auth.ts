import { Router } from "express";
import type { Db } from "../db/index.js";
import { verifyPassword } from "../domain/password.js";
import { createSession, parseCookie, resolveSession, SESSION_COOKIE } from "../session.js";

export function authRouter(db: Db): Router {
  const router = Router();

  // Lets the UI recognize an existing session (e.g. one restored from
  // Playwright's storageState) on page load, instead of only reacting to the
  // login form being submitted.
  router.get("/me", (req, res) => {
    const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
    const userId = resolveSession(token);
    const user = userId ? db.findUserById(userId) : undefined;
    if (!user) {
      res.status(401).json({ error: "not authenticated" });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  router.post("/login", (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const row = db.findUserByEmail(email);
    if (!row || !verifyPassword(password, row.passwordHash, row.passwordSalt)) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }

    const token = createSession(row.id);
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax" });
    res.json({ user: { id: row.id, email: row.email, name: row.name, role: row.role } });
  });

  return router;
}
