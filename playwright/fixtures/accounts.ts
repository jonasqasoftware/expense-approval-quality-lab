import { SEED_ACCOUNTS, SEED_PASSWORD } from "../../src/db/seed.js";

/**
 * Re-exports the same deterministic seed accounts the SUT is booted with —
 * fixed on purpose, not created per test. See docs/TEST_STRATEGY.md, "Test data".
 *
 * `displayName` mirrors the presentation-only mapping in src/public/app.js
 * (USER_DISPLAY_NAMES) — the seed's `name` field stays in English (seed.ts is
 * out of scope for localization), but the UI shows a PT-BR label, so E2E
 * assertions need the same translated string the browser will actually render.
 */
export const accounts = {
  managerA: { ...SEED_ACCOUNTS.managerA, password: SEED_PASSWORD, displayName: "Gestor A" },
  managerB: { ...SEED_ACCOUNTS.managerB, password: SEED_PASSWORD, displayName: "Gestor B" },
  employeeA: { ...SEED_ACCOUNTS.employeeA, password: SEED_PASSWORD, displayName: "Colaborador A" },
  employeeB: { ...SEED_ACCOUNTS.employeeB, password: SEED_PASSWORD, displayName: "Colaborador B" },
};

export type SeedAccount = (typeof accounts)[keyof typeof accounts];
