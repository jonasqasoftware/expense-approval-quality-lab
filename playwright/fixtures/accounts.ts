import { SEED_ACCOUNTS, SEED_PASSWORD } from "../../src/db/seed.js";

/**
 * Re-exports the same deterministic seed accounts the SUT is booted with —
 * fixed on purpose, not created per test. See docs/TEST_STRATEGY.md, "Test data".
 */
export const accounts = {
  managerA: { ...SEED_ACCOUNTS.managerA, password: SEED_PASSWORD },
  managerB: { ...SEED_ACCOUNTS.managerB, password: SEED_PASSWORD },
  employeeA: { ...SEED_ACCOUNTS.employeeA, password: SEED_PASSWORD },
  employeeB: { ...SEED_ACCOUNTS.employeeB, password: SEED_PASSWORD },
};

export type SeedAccount = (typeof accounts)[keyof typeof accounts];
