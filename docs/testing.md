# Testing Documentation

This doc describes the E2E-only test strategy with Playwright and the test scripts.

## Test Strategy

- **Approach**: E2E-only with Playwright; no unit/integration test suite. Rationale and possible future unit tests are in [Architecture evolution](architecture-evolution-product-hardening.md#2-e2e-only-with-playwright).
- **Scope**: Authenticated flows (Clerk, roles), key user journeys; test files in `e2e/*.spec.ts`.
- **CI**: On PRs to `staging` or `main`, GitHub Actions runs lint, format, and typecheck. An E2E job exists in [.github/workflows/ci.yml](../.github/workflows/ci.yml) but is **disabled by default** (`if: false` on the `e2e` job). Run `yarn e2e:test` locally (or enable that job) when you need automated E2E in CI. Full pipeline and release behavior: [Infrastructure](infrastructure.md). Pre-launch checklist: [pre-launch.md](pre-launch.md).

## Test Scripts

| Script | Purpose |
|--------|--------|
| `yarn e2e:install` | Install Playwright browsers (first-time) |
| `yarn e2e:test` | Run E2E headless (uses dotenv from `.env`) |
| `yarn e2e:test:ui` | Run E2E with Playwright UI |
| `yarn e2e:test:ci` | E2E for CI (no dotenv; env from workflow) |
| `yarn e2e:install:ci` | Install Chromium only (CI) |

## E2E details

Setup, env vars, CI configuration, auth, and test users are documented in **[e2e/README.md](../e2e/README.md)**.
