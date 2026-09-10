import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { createDb } from "./index.js";
import { hashPassword } from "../domain/password.js";

/**
 * Deterministic seed accounts. Fixed on purpose (not created per-test) so the
 * authorization graph (who manages whom) is stable and reusable across the
 * whole suite — see docs/TEST_STRATEGY.md, "Test data".
 */
export const SEED_PASSWORD = "Test@1234";

export const SEED_ACCOUNTS = {
  managerA: { email: "manager-a@example.test", name: "Manager A", role: "manager" as const },
  managerB: { email: "manager-b@example.test", name: "Manager B", role: "manager" as const },
  employeeA: { email: "employee-a@example.test", name: "Employee A", role: "employee" as const },
  employeeB: { email: "employee-b@example.test", name: "Employee B", role: "employee" as const },
};

export function seed(dbPath: string) {
  if (dbPath !== ":memory:") {
    // Every run starts from a clean, deterministic slate — see docs/TEST_STRATEGY.md.
    for (const suffix of ["", "-shm", "-wal"]) {
      if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix);
    }
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = createDb(dbPath);

  const { hash: hashA, salt: saltA } = hashPassword(SEED_PASSWORD);
  const managerAId = db.insertUser({
    ...SEED_ACCOUNTS.managerA,
    managerId: null,
    passwordHash: hashA,
    passwordSalt: saltA,
  });

  const { hash: hashB, salt: saltB } = hashPassword(SEED_PASSWORD);
  const managerBId = db.insertUser({
    ...SEED_ACCOUNTS.managerB,
    managerId: null,
    passwordHash: hashB,
    passwordSalt: saltB,
  });

  const { hash: hashC, salt: saltC } = hashPassword(SEED_PASSWORD);
  db.insertUser({
    ...SEED_ACCOUNTS.employeeA,
    managerId: managerAId,
    passwordHash: hashC,
    passwordSalt: saltC,
  });

  const { hash: hashD, salt: saltD } = hashPassword(SEED_PASSWORD);
  db.insertUser({
    ...SEED_ACCOUNTS.employeeB,
    managerId: managerBId,
    passwordHash: hashD,
    passwordSalt: saltD,
  });

  return db;
}

const isMain = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMain) {
  const path = process.env["DB_PATH"] ?? "./data/dev.sqlite";
  seed(path);
  console.log(`Seeded ${path} with 2 managers and 2 employees.`);
}
