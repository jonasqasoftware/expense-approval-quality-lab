import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests",
  // First version prioritizes determinism over parallel speed: the whole suite
  // shares one Express process and one SQLite database started by webServer.
  // See docs/TEST_STRATEGY.md, "Parallelism" for why this is a deliberate choice,
  // not an oversight.
  workers: 1,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run seed && npm start",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env["CI"],
    env: {
      PORT: String(PORT),
      DB_PATH: "./data/test.sqlite",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "api",
      testDir: "./tests/api",
    },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-critical",
      testDir: "./tests/e2e",
      // Restricted to the single critical journey (create + approve), not the
      // whole E2E suite — see docs/TEST_STRATEGY.md, "Mobile".
      testMatch: ["create-expense.spec.ts", "approve-expense.spec.ts"],
      dependencies: ["setup"],
      use: { ...devices["Pixel 5"] },
    },
  ],
});
