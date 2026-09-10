# Test Strategy

## Context

This lab exists to demonstrate Quality Engineering judgment with Playwright and
TypeScript, not to build a production expense system. The system under test
(SUT) is a small, self-contained expense-approval workflow: an employee
submits an expense, a manager decides it. It is deliberately just large enough
to carry real authorization and state-machine risk.

## Risk model

| Risk | Why it matters |
|---|---|
| Invalid amount reaches the ledger | Financial data integrity |
| A manager approves their own expense | Segregation-of-duties / fraud control |
| A non-manager can call the approval endpoint | Privilege escalation |
| An employee sees another employee's expenses | Data leakage between colleagues |
| A rejection carries no reason | No audit trail for a financial decision |
| A decided expense can still be edited | State-machine corruption |

## Scope

- Authentication (session cookie, login form).
- Expense creation, listing, approval, rejection, edit — exactly the flows
  behind the risks above.
- One deliberately restricted mobile check of the critical journey.

## Out of scope

- Performance/load testing — already evidenced elsewhere in the portfolio
  (`reino-do-recurso-real-api`'s k6 profile).
- A dedicated accessibility suite — this lab uses semantic HTML and
  role-based locators throughout, which is itself the accessibility evidence;
  it does not duplicate the Axe suite already published in
  `reino-do-recurso-real-api`.
- Cross-browser matrix (Firefox/WebKit) — Chromium only, by design (see
  "Browsers" below). Easy to extend, not required to prove the strategy.
- Visual regression, BDD/Cucumber — not this project's job; see the
  portfolio's other labs for those angles.

## Scenarios

| ID | Scenario | Risk | Layer | Priority | Why this layer |
|---|---|---|---|---|---|
| S1 | Employee logs in and submits a valid expense | Broken critical path | E2E | P0 | Only the UI proves the whole journey actually works end to end |
| S2 | An amount of zero or less is rejected | Bad financial data | API | P0 | Pure validation — cheaper and more deterministic off the UI |
| S3 | Manager approves a pending expense | Second half of the critical path | E2E | P0 | Needs to be seen working through the real interface |
| S4 | A manager cannot approve their own expense | Segregation of duties | API | P0 | An authorization rule, isolated from UI noise |
| S5 | An employee cannot call the approval endpoint | Privilege escalation | API | P1 | Negative authorization test, cheap and deterministic |
| S6 | Rejecting without a reason is blocked in the form | No audit trail | E2E | P1 | Only observable client-side — the API's own validation is covered by S4/S5's sibling assertions and is a separate concern from the form's own guard |
| S7 | Expense listing is scoped by role/team | Data leakage | API | P1 | An authorization/read-scope rule, tested with prepared data via API |
| S8 | A decided expense cannot be edited by its owner | State-machine corruption | E2E | P2 | Secondary path, cheap to automate, proves the UI — not just the API — respects the state machine |

## API vs E2E

Every rule that can be proven without a browser is proven without one:
validation (S2), authorization (S4, S5, S7). The only things that stay E2E are
things that are *only* observable in the interface: the full login-to-submit
journey (S1), the approval button actually updating what the user sees (S3),
a form blocking an empty required field before any request is sent (S6), and
a control simply not being offered once a state transition has happened (S8).
No scenario is tested twice across both layers for the same reason.

## Test data

Four **fixed, seeded** accounts (`manager-a`, `manager-b`, `employee-a` →
manages under `manager-a`, `employee-b` → manages under `manager-b`) exist for
the whole run — see `src/db/seed.ts`. They are not created per test. Tests
create their own **expenses** via the API before exercising a journey, using
short, descriptive, fixed titles ("Client dinner", "Unjustified software
license") instead of randomly generated data — a reviewer should be able to
read a test and immediately know what it is asserting, and a fixed name never
introduces its own flakiness.

## Authentication

A cookie-based session is used. API tests authenticate their own
`APIRequestContext` per fixture (`playwright/fixtures/api.ts` —
`employeeApi`, `managerApi`, `otherManagerApi`), each logging in once and
reusing that context for every call. E2E tests avoid repeating a UI login
before every test: a `setup` project (`tests/setup/auth.setup.ts`) logs in
once per role and saves `storageState` to `playwright/.auth/*.json` (git­
ignored — session cookies must never be committed, even for synthetic
accounts). S1 is the deliberate exception: logging in through the real form
*is* part of its story, so it does not use `storageState`.

## Isolation

Every test creates the specific records it needs before asserting against
them, and assertions check "does my record behave correctly" rather than
"is the list exactly N items long" — so tests remain correct even when the
shared database accumulates rows from other tests in the same run. No test
depends on another test having run first.

## Parallelism

`workers: 1` for the whole suite, on purpose. The SUT is a single Express
process backed by one SQLite file started once by Playwright's `webServer`
for the entire run — not per project. Turning on `fullyParallel` before
proving isolation would risk exactly the kind of shared-state flakiness this
lab is supposed to demonstrate *avoiding*. A per-worker database (in-memory
per worker, or a schema-per-worker convention) is the natural next step if
parallel execution is ever needed — **FUTURE CANDIDATE**, not required to
prove this strategy.

One direct consequence: because the server and database persist across the
whole `playwright test` invocation, running the *same* scenario file on two
different projects (see "Mobile" below) would otherwise create two rows with
an identical title. `create-expense.spec.ts` and `approve-expense.spec.ts`
avoid that by composing the expense title from `testInfo.project.name`
(e.g. `"Airport taxi — mobile-critical"`), so each project's run of the
scenario creates a row that is unique by construction — no positional
locator (`.first()`, `.last()`, `.nth()`) is needed, and the isolation
principle from the paragraph above ("every test creates the specific record
it needs") holds even across projects, not just across tests.

## Mobile

A `mobile-critical` project (Pixel 5 viewport) reruns only the two P0 E2E
scenarios that together make up the critical path (S1, S3) — not the whole
suite. It exists to prove the journey is usable on a small viewport, not to
double test coverage. Building it surfaced a real responsive bug (the
expenses table had no overflow handling, so the Approve button was
unreachable on a narrow viewport) — fixed by wrapping the table in a
horizontally scrollable container (`src/public/styles.css`, `.table-scroll`).

## Flakiness

Verified by static search (no `waitForTimeout`, no CSS class/`nth`/XPath
locators, no test depends on another) and empirically: the full suite (API +
E2E, both projects) was run three consecutive times with zero flaky results
before this lab was called done.

## CI

GitHub Actions runs, in order: `typecheck`, `lint`, `test:api`, `test:e2e`.
Each gate is independent so a CI failure immediately says which layer broke
without needing to open the HTML report. The report and any trace/screenshot/
video are uploaded only when a run has failures.

## Exit criteria

All 8 scenarios green, `typecheck` and `lint` clean, three consecutive full
local runs green, no anti-pattern found in the static scan above, and no
secret or credential (real or realistic-looking) anywhere in the repository.
