# Expense Approval Quality Lab

**Playwright · TypeScript · Quality Engineering**

A small, deterministic expense-approval workflow, tested end to end and at
the API layer with Playwright and TypeScript — built to show how the tests
were *decided*, not just that they exist.

## What it is

An employee submits an expense; a manager approves or rejects it. That is the
whole product. It exists to carry enough real risk (authorization,
segregation of duties, a state machine) to justify a genuine testing
strategy, without becoming a project about the product itself.

## The quality problem

Anyone can list Playwright on a résumé. This repository is the answer to a
more specific question: does this person know *why* a given check belongs in
the API layer instead of the UI, how to keep a browser suite deterministic
under a shared backend, and how to make a test's evidence useful when it
fails — not just how to call `page.click()`.

## The system under test

- Two roles: **employee** and **manager**.
- An expense moves through exactly one path: `pending → approved` or
  `pending → rejected`. Once decided, it is immutable.
- A manager may only decide expenses belonging to the employees who report to
  them, and — regardless of role — nobody may decide their own expense.
- Four fixed seed accounts model this: `manager-a`/`manager-b`, each managing
  `employee-a`/`employee-b` respectively. See `src/db/seed.ts`.

## Risk model

| Risk | Mitigated by |
|---|---|
| Invalid amount reaches the ledger | Server-side validation (S2) |
| A manager approves their own expense | Segregation-of-duties rule (S4) |
| A non-manager calls the approval endpoint | Role check (S5) |
| An employee sees another employee's expenses | Scoped listing (S7) |
| A rejection has no reason | Required-reason validation (S6) |
| A decided expense is edited afterwards | State-machine guard (S8) |

Full detail, including *why* each scenario lives where it lives, is in
[`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

## Test strategy

8 scenarios total — 4 API, 4 E2E — deliberately not more. Every rule that
does not require a browser to observe is tested without one:

| ID | Scenario | Layer | Priority |
|---|---|---|---|
| S1 | Employee logs in and submits a valid expense | E2E | P0 |
| S2 | An amount ≤ 0 is rejected | API | P0 |
| S3 | Manager approves a pending expense | E2E | P0 |
| S4 | A manager cannot approve their own expense | API | P0 |
| S5 | An employee cannot call the approval endpoint | API | P1 |
| S6 | Rejecting without a reason is blocked in the form | E2E | P1 |
| S7 | Expense listing is scoped by role/team | API | P1 |
| S8 | A decided expense cannot be edited by its owner | E2E | P2 |

## API vs E2E

Validation and authorization (S2, S4, S5, S7) are proven at the API layer —
faster, and they do not need a browser to be true. Only what a browser is
required to observe stays E2E: the full journey through the real UI (S1, S3),
a form blocking an empty required field before any request fires (S6), and a
control simply not being rendered once a state transition happened (S8).

## Authentication and state

Cookie-based sessions. E2E tests reuse a `storageState` generated once per
role by a `setup` project (`tests/setup/auth.setup.ts`) instead of logging in
through the UI before every test — the one exception is S1, where the login
*is* the story. API tests authenticate their own `APIRequestContext` via
fixtures in `playwright/fixtures/api.ts`. Session files live in
`playwright/.auth/` and are git-ignored; they are never committed.

## Running locally

Requirements: Node.js ≥ 20.

```bash
npm ci
npx playwright install chromium

npm run typecheck
npm run lint
npm run test:api
npm run test:e2e
# or both:
npm test
```

To click through it by hand: `npm run seed` once (creates and seeds
`./data/dev.sqlite`), then `npm run dev` (`http://localhost:3100` by default,
default `PORT`/`DB_PATH` can be overridden via environment variables). Log in
as `employee-a@example.test` / `Test@1234` (see `src/db/seed.ts` for all four
accounts and the fixed password).

## CI

GitHub Actions (`.github/workflows/tests.yml`) runs, as independent gates:
`typecheck` → `lint` → `test:api` → `test:e2e`. The Playwright HTML report and
any trace/screenshot/video are uploaded only when a run fails.

## Technical decisions

- **`workers: 1`, deliberately.** The whole suite shares one Express process
  and one SQLite database started once by Playwright's `webServer`. Proving
  isolation came first; parallelism is a documented future step, not a
  default. See "Parallelism" in `docs/TEST_STRATEGY.md`.
- **No Page Object layer.** Locators and actions live directly in the four
  spec files. Four short, independent specs do not yet repeat enough to
  justify an abstraction; if a fifth scenario needed the same three-step
  "create via API, open the row, act on it" sequence, that would be the
  trigger to extract it — not before.
- **Fixed seed accounts, per-test expenses.** Users are not created
  dynamically — only the records under test are. See "Test data" in
  `docs/TEST_STRATEGY.md`.
- **A `mobile-critical` project, not a mobile suite.** Only the two P0
  scenarios that make up the critical path rerun on a Pixel 5 viewport.
  Building it surfaced a real responsive bug (the expenses table had no
  overflow handling), fixed with a scrollable container — not a redesign.

## Failure evidence

`trace: "on-first-retry"`, `screenshot: "only-on-failure"`,
`video: "retain-on-failure"` — evidence accumulates only when something is
actually wrong, not on every green run.

## What is intentionally out of scope

- **Performance/load testing** — already demonstrated elsewhere in the
  portfolio (`reino-do-recurso-real-api`'s k6 profile).
- **A dedicated accessibility suite** — this lab's semantic HTML and
  role-based locators are themselves the accessibility evidence; a separate
  Axe suite already exists in `reino-do-recurso-real-api`.
- **Firefox/WebKit** — Chromium only, by design; trivial to add as another
  `project`, not required to prove the strategy.
- **BDD/Cucumber, visual regression, security testing** — each belongs to a
  different lab in this portfolio, not this one.

## Stack

Node.js, TypeScript (`strict: true`), Express, better-sqlite3, Playwright
Test. Versions actually used in this repo: Node 20+ (developed on 24.20.0),
`@playwright/test` 1.63.0, `typescript` 5.9.3.
