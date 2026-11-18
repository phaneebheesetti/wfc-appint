# E2E tests (Playwright)

End-to-end tests run with [Playwright](https://playwright.dev/). They exercise the app in a real browser and follow [Clerk’s Playwright testing guide](https://clerk.com/docs/guides/development/testing/playwright/overview) for authenticated flows: global setup obtains a Testing Token; tests sign in with a test email and verification code.

## Prerequisites

- App running (e.g. `yarn dev`) or rely on the config `webServer` (reuse existing server when not in CI).
- Clerk test environment: verification uses code `424242`. Test users are **created by global setup** in Clerk and the database (no need to manually create them).

## Environment variables

Set these before running e2e tests (e.g. in `.env` or export in the shell):

| Variable                | Required | Description                                                                                      |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key (for Testing Token).                                                       |
| `CLERK_SECRET_KEY`      | Yes      | Clerk secret key (for Testing Token and for `ensureAllTestUsers` to create/sync users in Clerk). |
| `DATABASE_URL`          | Yes      | Database URL. Required by global setup `ensureAllTestUsers` to create/sync test users in the DB. |
| `APP_URL`               | No       | App URL (default: `http://localhost:3000`).                                                      |

Locally, set these in `.env` or export them. In CI, only the Clerk keys are stored as secrets; `DATABASE_URL` and related Supabase vars are provided by local Supabase (see below).

## CI

E2E tests run in GitHub Actions on every pull request to `staging` or `main` (see `.github/workflows/ci.yml`). The CI job:

- Uses **Supabase CLI** (local Supabase) for the database: `supabase start` runs a local Supabase stack; `DATABASE_URL`, `DATABASE_MIGRATIONS_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set from `supabase status -o env`. Migrations and seed run before tests (`yarn db:migrate && yarn db:seed`). No external DB is required.
- Sets **`SKIP_ENV_VALIDATION=true`** so the Next.js app starts without validating the full env schema in `src/env.js`. Only the env vars needed for E2E are required in CI (Clerk keys, Supabase/DB vars above, `APP_URL`, and minimal redirect URLs). Other app env (Stripe, SendGrid, etc.) is not required for the current E2E flow.

**Required GitHub secrets** (Settings → Secrets and variables → Actions):

| Secret                  | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the **test** instance used in E2E.                               |
| `CLERK_SECRET_KEY`      | Clerk secret key for the same test instance (Testing Token + user creation in auth setup). |

Use a dedicated Clerk development/test application; do not use production keys in CI.

On E2E failure, the workflow uploads the Playwright report and `test-results/` (traces, screenshots) as artifacts (retention 7 days).

## Commands

- **First-time setup**: run `yarn e2e:install` once to install Playwright browsers.
- `yarn e2e:test` — run all e2e tests (headless).
- `yarn e2e:test:ui` — run tests with Playwright UI.

## Auth

Test users are defined in `e2e/auth.setup.ts`: the `testUsers` array and `testUsersByRole` map. Each **TestUser** has `email`, `name`, `role`, `databaseId`, and optional `parentId` (e.g. Participant’s `parentId` points to Parent).

Global setup (`e2e/auth.setup.ts`) (1) runs `ensureAllTestUsers()`: for each user in `testUsers` it looks up by email in Clerk and the database; creates the user in both if missing (Clerk `publicMetadata` is set to `databaseId` and `role`); for existing users, syncs Clerk `publicMetadata` and DB `clerkId` / `parentUserId` when out of date. Then (2) runs `clerkSetup()` to fetch a Clerk Testing Token so sign-in requests are not blocked by bot detection. Each test user uses a fixed UUID so the same `databaseId` works in both local and staging DBs. Specs get the user from `testUsersByRole` (e.g. `sales-representative-setup.spec.ts` uses the sales representative) and use the `email_code` strategy with that user’s email.

### Test users

Seven users cover all roles; emails use the `+clerk_test@example.com` [Clerk test email](https://clerk.com/docs/testing/test-emails-and-phones#email-addresses) pattern:

| Role                 | Email                                                        |
| -------------------- | ------------------------------------------------------------ |
| WFC Admin            | `e2e_wfc_admin+clerk_test@example.com`                       |
| Sales Manager        | `e2e_sales_manager+clerk_test@example.com`                   |
| Sales Representative | `e2e_sales_representative+clerk_test@example.com`            |
| Organization Admin   | `e2e_organization_admin+clerk_test@example.com`              |
| Organization Staff   | `e2e_organization_staff+clerk_test@example.com`              |
| Participant          | `e2e_participant+clerk_test@example.com` (parentId → Parent) |
| Parent               | `e2e_parent+clerk_test@example.com`                          |

## Tests

Test files live in `e2e/*.spec.ts`.
