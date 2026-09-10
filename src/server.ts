import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { createDb } from "./db/index.js";
import { authRouter } from "./routes/auth.js";
import { expensesRouter } from "./routes/expenses.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp(dbPath: string) {
  const db = createDb(dbPath);
  const app = express();

  app.use(express.json());
  app.use(express.static(join(__dirname, "public")));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter(db));
  app.use("/api/expenses", expensesRouter(db));

  return app;
}

const isMain = process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js");
if (isMain) {
  const port = Number(process.env["PORT"] ?? 3100);
  const dbPath = process.env["DB_PATH"] ?? "./data/dev.sqlite";
  const app = createApp(dbPath);
  app.listen(port, () => {
    console.log(`expense-approval-quality-lab listening on http://localhost:${port} (db: ${dbPath})`);
  });
}
