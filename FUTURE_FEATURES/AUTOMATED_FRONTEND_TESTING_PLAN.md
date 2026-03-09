# Automated Frontend Testing Plan for Maria Writer

**Status:** Proposed  
**Last Updated:** March 9, 2026  
**Recommendation:** Playwright + Page Object Model (POM) first, with optional BDD layer later via `playwright-bdd`

---

## Table of Contents
1. [Goals](#goals)
2. [Current State](#current-state)
3. [Recommended Testing Strategy](#recommended-testing-strategy)
4. [Why Playwright](#why-playwright)
5. [Why Not Start With Raw Cucumber](#why-not-start-with-raw-cucumber)
6. [Proposed Test Pyramid](#proposed-test-pyramid)
7. [Recommended Folder Structure](#recommended-folder-structure)
8. [Implementation Phases](#implementation-phases)
9. [Step-by-Step Breakdown](#step-by-step-breakdown)
10. [Initial Test Coverage Plan](#initial-test-coverage-plan)
11. [CI/CD Plan](#cicd-plan)
12. [Risks and Mitigations](#risks-and-mitigations)
13. [Definition of Done](#definition-of-done)

---

## Goals

The automated frontend testing solution should:

- Catch regressions in the real browser UI
- Be easy to extend as new features are added
- Support a clean Page Object Model structure
- Work well with the existing React + Vite + TypeScript stack
- Be understandable for future contributors
- Allow a future BDD/Gherkin layer if the team wants more business-readable scenarios
- Run locally and in CI with consistent results

---

## Current State

### Existing Frontend Test Setup

The frontend already uses:

- React 18
- TypeScript
- Vite
- Vitest
- Testing Library

### Current Coverage Style

Current tests appear to focus on:

- Route behavior
- Basic integration rendering
- UI interactions in jsdom

### Gap to Fill

What is still missing is true browser-level automated testing for:

- Full routing and navigation flows
- Authentication journeys
- Cross-page workflows
- Form validation in a real browser
- Persistence and network-driven behavior
- Regression coverage for the main authoring experience

---

## Recommended Testing Strategy

### Recommendation

Use **Playwright** as the primary frontend end-to-end testing framework.

### Recommendation Details

1. Keep **Vitest + Testing Library** for unit/component/integration tests
2. Add **Playwright** for end-to-end and smoke/regression browser tests
3. Structure Playwright tests around a **Page Object Model (POM)**
4. Add reusable **fixtures**, **test data builders**, and **helper utilities**
5. Delay Cucumber until the core Playwright suite is stable
6. If BDD is still desired later, prefer **`playwright-bdd`** instead of a separate raw Cucumber stack

### Recommended Outcome

This gives:

- Fast local feedback from Vitest
- Reliable real-browser coverage from Playwright
- Cleaner tests through page objects
- A lower-maintenance path than introducing Cucumber immediately

---

## Why Playwright

Playwright is the best fit here because it provides:

- Excellent TypeScript support
- Strong support for Chromium, Firefox, and WebKit
- Auto-waiting and robust locator APIs
- Built-in retries, traces, screenshots, and videos
- Good CI support
- Easy local debugging with UI mode
- First-class network mocking when needed

For this project specifically, it is a strong match because the app is a Vite-based SPA and likely needs reliable routing, auth flow, and browser-state validation.

---

## Why Not Start With Raw Cucumber

Cucumber is useful when:

- Non-technical stakeholders actively write or review scenarios
- There is a real need for business-readable Gherkin specifications
- The team has the discipline to maintain a clean step-definition library

However, starting with raw Cucumber adds overhead:

- Another abstraction layer to maintain
- Step definitions can become duplicated or overly generic
- Debugging often becomes slower than plain Playwright tests
- Teams can end up with feature files that look clean but map to brittle internals

### Practical Recommendation

Start with plain Playwright + POM.

If the suite grows and the team still wants Gherkin, add **`playwright-bdd`** in a later phase so that:

- Existing page objects remain reusable
- Existing fixtures remain reusable
- Browser debugging and Playwright tooling are preserved

---

## Proposed Test Pyramid

### Keep Existing Layers

- **Unit tests:** pure utilities, reducers, formatters, validation helpers
- **Component/integration tests:** important React flows using Vitest + Testing Library

### Add New Layer

- **E2E tests with Playwright:** critical workflows only

### Coverage Balance

Recommended split:

- Many unit/component tests for logic-heavy behavior
- A moderate number of Playwright tests for critical user journeys
- Avoid trying to test every edge case end-to-end

---

## Recommended Folder Structure

Suggested structure under the frontend project:

```text
maria-writer-react/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts
│   │   ├── project.fixture.ts
│   │   └── testData.ts
│   ├── pages/
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── EditorPage.ts
│   │   ├── ProfilePage.ts
│   │   ├── StatisticsPage.ts
│   │   └── components/
│   │       ├── TopBarComponent.ts
│   │       ├── SidebarComponent.ts
│   │       ├── ModalComponent.ts
│   │       └── ToastComponent.ts
│   ├── flows/
│   │   ├── authFlows.ts
│   │   ├── editorFlows.ts
│   │   └── projectFlows.ts
│   ├── specs/
│   │   ├── smoke/
│   │   ├── auth/
│   │   ├── editor/
│   │   ├── profile/
│   │   └── statistics/
│   ├── utils/
│   │   ├── apiHelpers.ts
│   │   ├── storageHelpers.ts
│   │   └── waitHelpers.ts
│   ├── data/
│   │   ├── users.ts
│   │   └── projects.ts
│   └── README.md
├── playwright.config.ts
└── package.json
```

### Structure Notes

- `pages/` contains page objects for full pages
- `components/` contains reusable UI fragments shared across pages
- `flows/` contains business actions composed from multiple page objects
- `fixtures/` contains Playwright fixtures and test setup helpers
- `specs/` contains the actual tests

This keeps tests readable and prevents page objects from becoming giant classes.

---

## Implementation Phases

### Phase 1: Foundation
Set up Playwright and confirm the app can run reliably under automated browser tests.

### Phase 2: Core Test Architecture
Add page objects, fixtures, seeded data strategy, and test conventions.

### Phase 3: Critical User Journeys
Implement smoke tests and core regression coverage.

### Phase 4: CI Hardening
Run tests in CI, collect artifacts, and stabilize flaky areas.

### Phase 5: Optional BDD Layer
Introduce `playwright-bdd` only if the team still wants Gherkin scenarios after the base suite proves useful.

---

## Step-by-Step Breakdown

### Step 1: Confirm test scope and ownership

Decide exactly what frontend automation should own:

- Smoke tests for basic app availability
- Auth flows
- Editor core workflow
- Profile and statistics pages
- Project persistence/sync behavior where feasible

Output:

- A short list of critical journeys that must never break

---

### Step 2: Install Playwright and browser dependencies

Add the Playwright test runner and supported browsers to the frontend project.

Planned additions:

- `@playwright/test`
- Playwright browser binaries

Also add package scripts for:

- running all E2E tests
- running headed mode locally
- running UI mode
- running smoke-only tests

Output:

- Browser automation installed and runnable locally

---

### Step 3: Create base Playwright configuration

Create a `playwright.config.ts` with:

- `baseURL` for the frontend app
- retries in CI only
- trace collection on failure
- screenshots on failure
- video retention for failed tests
- separate projects for Chromium first
- optional later expansion to Firefox/WebKit

Recommendation:

- Start with Chromium only for speed and stability
- Add cross-browser runs after the suite is stable

Output:

- One consistent configuration for local and CI execution

---

### Step 4: Decide app runtime strategy for tests

Choose how E2E tests will run against the app.

Recommended order:

1. Start the frontend dev server automatically during E2E runs
2. Point Playwright to the local backend when backend-dependent flows are tested
3. Use mocked APIs only when isolating specific frontend behavior

Preferred initial approach:

- Real frontend
- Real backend for critical integrated flows
- Minimal mocking

Reason:

This gives the highest confidence for routing, auth, and persistence behavior.

Output:

- Agreed local execution model for E2E tests

---

### Step 5: Define environment and test accounts strategy

Set up dedicated test users and test-safe environment values.

Plan for:

- one seeded standard user
- one admin user if admin coverage is needed later
- deterministic test project data
- a reset or cleanup approach between runs

Important decision:

The test suite must not depend on manually created data.

Output:

- Reproducible test data strategy

---

### Step 6: Create the POM architecture

Create a lightweight Page Object Model design.

Recommended rules:

- One class per major page
- Shared components extracted into separate component objects
- Page objects expose user actions and assertions, not raw selectors everywhere
- Avoid putting test logic inside page object classes

Example responsibilities:

- `LoginPage`: visit, fill login form, submit, assert validation
- `EditorPage`: create chapter, switch view, open metadata modal, save project
- `ProfilePage`: update profile details, upload or change profile-related fields if added later
- `StatisticsPage`: navigate and assert charts/summary sections render

Output:

- A clear maintainable object model for browser tests

---

### Step 7: Establish locator strategy standards

Create team rules for selectors.

Recommended priority:

1. semantic locators by role and accessible name
2. labels and placeholder text where appropriate
3. dedicated `data-testid` only for unstable or ambiguous UI

Avoid:

- brittle CSS selectors
- deep DOM traversal
- text selectors for content that is likely to change frequently

Output:

- Stable selector conventions before writing many tests

---

### Step 8: Add shared fixtures and helper utilities

Create fixtures for common setup:

- authenticated user session
- clean project state
- seeded project loaded into the app
- storage cleanup before each test when needed

Also create helpers for:

- API-based login when UI login is not the thing under test
- local storage/session storage reset
- test data generation
- network wait helpers for known async operations

Output:

- Reusable setup that keeps tests short and readable

---

### Step 9: Implement smoke test suite first

Before writing many detailed tests, build a small smoke suite.

Recommended initial smoke scenarios:

1. App loads successfully
2. Unauthenticated user can reach login/register routes
3. Authenticated user can reach editor route
4. Profile page loads for an authenticated user
5. Statistics page loads

These tests should be fast and run on every PR.

Output:

- A minimal regression safety net

---

### Step 10: Add core authentication journeys

Build end-to-end coverage for:

- successful login
- failed login validation
- registration happy path
- logout
- protected route redirect and return flow

Because auth is central to the app, this should be one of the first deeper suites.

Output:

- High-confidence auth regression coverage

---

### Step 11: Add editor workflow coverage

Build tests for the core authoring experience.

Recommended initial editor scenarios:

- open editor and verify major sections render
- create a new chapter
- switch between manuscript and codex views
- open metadata modal and save changes
- verify expected persistence behavior

This is likely the highest-value area for the product.

Output:

- Core authoring workflow protected by automated tests

---

### Step 12: Add profile and statistics coverage

Add focused tests for:

- profile view rendering
- profile update flow
- required field validation
- statistics page rendering and navigation

Keep these targeted; avoid over-testing visual details that belong in manual QA.

Output:

- Coverage for the newly added account-oriented screens

---

### Step 13: Add network and error-state scenarios

Once happy paths are stable, add failure-path tests.

Recommended cases:

- backend unavailable
- expired or invalid session
- validation errors returned from API
- failed save/load flow
- unexpected server error banner or fallback UI

Output:

- Better resilience and user-facing error coverage

---

### Step 14: Add reporting, traces, and debugging workflow

Define how failures are investigated.

Playwright should be configured to retain:

- trace files on failure
- screenshots on failure
- video on failure where useful

Document:

- how to re-run a single spec
- how to open a trace locally
- how to debug in headed mode or UI mode

Output:

- Fast diagnosis process for failed E2E runs

---

### Step 15: Integrate into CI

Add E2E execution to CI in stages.

Recommended rollout:

1. Run smoke tests on every pull request
2. Run full E2E regression on protected branches or nightly
3. Publish traces/screenshots as build artifacts

Important:

- Do not block all delivery immediately on a large unstable suite
- Start with smoke gating and expand once stable

Output:

- E2E automation contributing value without creating delivery pain

---

### Step 16: Measure flakiness and stabilize

After the first working suite exists, review:

- failing selectors
- timing-sensitive tests
- over-coupled page objects
- duplicate helper methods
- places where API setup would be better than repeated UI setup

Goal:

- Keep tests deterministic and maintainable

Output:

- A stable suite that the team trusts

---

### Step 17: Optionally add BDD with `playwright-bdd`

Only do this if there is still a real need for business-readable scenarios.

Recommended approach:

- Keep page objects and fixtures exactly as they are
- Introduce feature files only for high-level business journeys
- Limit Gherkin to major acceptance scenarios
- Avoid translating every technical test into Gherkin

Good BDD candidates:

- login and protected route behavior
- registration journey
- create and save project journey
- profile update journey

Not good BDD candidates:

- low-level UI state checks
- layout-specific behavior
- minor validation edge cases

Output:

- Optional readable acceptance layer without replacing the core Playwright design

---

## Initial Test Coverage Plan

### Priority 1: Smoke

- App shell loads
- Editor route loads
- Login route loads
- Register route loads
- Protected route redirect works

### Priority 2: Authentication

- Login success
- Login failure
- Register success
- Logout
- Return-to flow after auth

### Priority 3: Core authoring

- Create chapter
- Navigate between sections
- Open and update metadata
- Verify persistence behavior

### Priority 4: Account and reporting

- Profile loads
- Profile updates save correctly
- Statistics page loads and key panels render

### Priority 5: Failure handling

- API error state
- Session expiry
- Save failure handling

---

## CI/CD Plan

### Local Developer Workflow

Developers should be able to:

- run all E2E tests locally
- run a single test file
- run tests in headed mode
- inspect traces after failures

### Pull Request Workflow

Recommended PR checks:

- existing Vitest suite
- Playwright smoke suite

### Nightly or Main Branch Workflow

Recommended extended checks:

- full Playwright regression suite
- optional cross-browser suite later

### Artifact Retention

Keep:

- trace files
- screenshots
- videos for failed runs
- a simple HTML report if practical

---

## Risks and Mitigations

### Risk: Flaky tests

Mitigation:

- use Playwright locators correctly
- avoid brittle selectors
- use fixtures for deterministic setup
- keep tests independent

### Risk: Slow test suite

Mitigation:

- keep smoke and regression suites separate
- use API setup when UI setup is repetitive
- run only critical journeys end-to-end

### Risk: Page objects becoming too large

Mitigation:

- split shared widgets into component objects
- move business flows into `flows/`
- keep assertions close to the tests unless repeated often

### Risk: BDD adding complexity too early

Mitigation:

- do not start with Cucumber first
- add BDD only after the base suite is stable and valuable

---

## Definition of Done

The frontend automation initiative should be considered complete for v1 when:

- Playwright is installed and documented
- A clean POM structure exists
- Smoke tests run locally and in CI
- Core auth and editor workflows are covered
- Failure artifacts are available for debugging
- Test data setup is reproducible
- The team has written guidance for adding new tests

---

## Final Recommendation

**Recommended path:**

1. Keep the current Vitest setup for unit/integration coverage
2. Add **Playwright** for browser automation
3. Implement a **POM-first structure**
4. Add **fixtures and reusable flows** before writing many tests
5. Start with **smoke + auth + core editor journeys**
6. Add **BDD later only if it proves necessary**

This is the best balance of speed, maintainability, and long-term scalability for Maria Writer.
