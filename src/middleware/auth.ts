import type { NextFunction, Request, Response } from "express";
import type { Db } from "../db/index.js";
import type { User } from "../domain/types.js";
import { parseCookie, resolveSession, SESSION_COOKIE } from "../session.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export function requireAuth(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
    const userId = resolveSession(token);
    if (!userId) {
      res.status(401).json({ error: "authentication required" });
      return;
    }
    const user = db.findUserById(userId);
    if (!user) {
      res.status(401).json({ error: "authentication required" });
      return;
    }
    req.user = user;
    next();
  };
}
