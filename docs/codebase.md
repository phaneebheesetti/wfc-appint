# Codebase documentation

This doc describes the WFC codebase: stack, structure, API design, state, and security. For a high-level picture of how the app is structured, see [Application architecture](architecture-diagram.md).

## Tech Stack

| Layer    | Technology      | Purpose                                    |
| -------- | --------------- | ------------------------------------------ |
| Runtime  | Node v22.14.0   | JavaScript runtime                         |
| Runtime  | Yarn v1.22.22   | Package and script management              |
| Frontend | Next.js 15.x    | React-based full-stack framework           |
| Frontend | Tailwind CSS    | Utility-first CSS styling                  |
| Frontend | tRPC            | Type-safe API between frontend and backend |
| Frontend | Zustand         | Client-side state management               |
| Frontend | React Hook Form | Form state and validation                  |
| Frontend | Shadcn / Radix  | Accessible UI primitives and design system |
| Frontend | Sonner          | In-app toast notifications                 |
| Frontend | React Email     | Transactional email templates              |
| Frontend | Recharts        | Charts and data visualization              |
| Frontend | TipTap          | Rich text editor                           |
| Frontend | TanStack Query  | Server state and request caching           |
| Backend  | Supabase        | Hosted Postgres database                   |
| Backend  | Drizzle ORM     | ORM, schema, and migrations                |
| Backend  | Clerk           | User authentication and sessions           |
| Backend  | SendGrid        | Transactional email sending                |
| Backend  | Ably            | Real-time messaging and presence           |
| Backend  | Twilio          | SMS sending                                |
| Backend  | Pino            | Structured application logging             |
| Backend  | PDFKit          | PDF creation and export                    |
| Backend  | xlsx            | Excel export and import                    |
| Infra    | Heroku          | App hosting and deployment                 |
| Infra    | Stripe          | Payment processing                         |
| Infra    | Sentry          | Error monitoring and reporting             |
| Infra    | PostHog         | Product analytics and feature flags        |
| Infra    | Playwright      | End-to-end browser tests                   |

## Git branch strategy

- **Branches:** `staging` deploys to staging; `main` deploys to production.
- **CI:** Runs on PRs to `staging` and `main` (lint, format, typecheck, E2E). See [Testing](testing.md).
- **Deploys:** Heroku pipeline; release phase runs `yarn db:migrate && yarn db:seed`.

Details: [Infrastructure](infrastructure.md).

## Codebase structure & modules

| Area | Path | Purpose |
| ---- | ---- | ------- |
| App | `src/app` | Next.js 15 App Router (dashboard, API routes, layouts) |
| tRPC API | `src/server/api` | `core.ts` (context, init), `trpc.ts` (procedures, middlewares), `root.ts` (app router), `routers/*.ts` (one file per domain) |
| Database | `src/server/db` | Drizzle schema and client |
| Services | `src/server/services` | Domain logic; one folder per area (e.g. `campaigns/`, `users/`); consumed by routers |
| UI | `src/components` | Feature-oriented React components |
| Client state | `src/stores` | Zustand stores |
| Client API | `src/trpc` | tRPC React client and server caller |
| Shared | `src/hooks`, `src/lib`, `src/constants`, `src/utils` | Hooks, libs, constants, utilities |

## tRPC API layer & service design

- **Procedure type:** All procedures use `publicProcedure`. Middleware chain: timing → Sentry → `userRoleMiddleware` (sets Postgres `request.jwt.claims` and `SET ROLE authenticated|anon` per request).
- **Context:** Populated in [src/app/api/trpc/[trpc]/route.ts](../src/app/api/trpc/[trpc]/route.ts) from Clerk (`auth()`): `userId`, `userRole`, `headers`, `db` passed into every procedure.
- **Routers:** Thin layer: Zod input validation + call into `src/server/services/*`. Services receive `{ database, input }` (and `ctx` when needed) and contain business logic; they throw `TRPCError` (e.g. `FORBIDDEN`, `NOT_FOUND`) where appropriate.
- **Root:** [src/server/api/root.ts](../src/server/api/root.ts) merges all routers into `appRouter`; `createCaller` for server-side calls.
- **Client:** [src/trpc/react.tsx](../src/trpc/react.tsx) — `createTRPCReact` + TanStack Query; `httpBatchStreamLink` to `/api/trpc`; SuperJSON. Components use `api.<router>.<procedure>.useQuery` / `useMutation` / `useUtils()`.

## State management

- **Server state:** TanStack Query + tRPC (`api.*.useQuery` / `useMutation`). Caching and invalidation via `api.useUtils()`.
- **Client state:** Zustand for UI/wizard and permission helpers (e.g. [src/stores/participants-upload-store.ts](../src/stores/participants-upload-store.ts), [src/stores/permissions-store.ts](../src/stores/permissions-store.ts)); React Hook Form for form state and validation.
- State is kept as local as possible; no global Redux-style store.

## Security principles

- **Env:** [src/env.js](../src/env.js) — validated at build with `@t3-oss/env-nextjs`; server vs client vars; no secrets in client.
- **Auth:** Clerk; session claims (`user_id`, `user_role`) in tRPC context. No procedure-level “require auth” middleware; procedures/services that need it check `ctx.userId` / `ctx.userRole` and throw (e.g. `TRPCError` with `FORBIDDEN`).
- **Authz:** Role/permission model in [src/constants/roles.tsx](../src/constants/roles.tsx) and [src/constants/role-permissions.ts](../src/constants/role-permissions.ts); UI uses permissions store for visibility; backend enforces in procedures/services.
- **Database:** Supabase with RLS enabled. `userRoleMiddleware` runs each request in a transaction, sets `request.jwt.claims` and `SET ROLE authenticated|anon`, so RLS policies can use role/claims.
- **API routes:** Wrap App Router API route handlers with `withSentry` from `@/utils/api` so errors are captured by Sentry.

## Authentication and authorization

- **Clerk** for sign-in, sign-up, and sessions; redirect URLs are in env and must match the app URL per environment.
- Broader security (env, authz, RLS): see [Security principles](#security-principles) above.
- **Roles** are defined in [src/constants/roles.tsx](../src/constants/roles.tsx); tRPC attaches user/role via [userRoleMiddleware](../src/server/api/middlewares/user-role-middleware.ts); authorization is enforced inside procedures/services (no single auth-layer file).
- For Clerk dashboard access, redirect URLs, and custom claims, see [Third-party services and handoff — Clerk](third-party-services/third-party-services-integrations-handoff.md#4-clerk). For how Clerk is wired in code, see [Third-party integrations — Clerk](third-party-services/clerk.md).

## Prerequisites

> Note: All commands below assume macOS. If you are on Windows or Linux, look up the equivalent commands for your operating system.


#### 1. Install Docker

You will need to install Docker to run Supabase locally.

#### 2. Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

#### 3. Start Supabase

The following command will start all necessary Supabase services using Docker.

```bash
supabase start
```

If you need to stop the Supabase services, run:

```bash
supabase stop
```

#### 4. Get environment variables

Create a `.env` file in the root of the project and copy the `.env.example` file to it.

```bash
cp .env.example .env
```

Or preferably ask someone in the project for the full `.env` file with all the values.

Next you need to replace the `.env` file with your local supabase instance values

To get the values you need to run:

```bash
supabase status
```

And then simply replace these values in your `.env` file with the ones from the supabase status output.

```
NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon key>
SUPABASE_SERVICE_ROLE_KEY = <service role key>
```

#### 5. Run Database migrations

```bash
yarn db:migrate
```

#### 6. Run Database Seed

```bash
yarn db:seed
```

#### 7. Run Database Setup with your email

```bash
yarn db:setup-user <email> <full-name> <role>
```

It creates a database user with the specified email for app sign-in. Role defaults to `ADMIN` if omitted.

> Run this once. After that you can invite other users to the app in the app itself.

## Running the app

### 1. Install Dependencies

```bash
yarn
```

### 2. Run locally

```bash
yarn dev
```

## Scripts

| Command              | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `yarn dev`           | Start Next.js dev server with Turbopack                                   |
| `yarn build`         | Production build                                                          |
| `yarn start`         | Start production server                                                   |
| `yarn preview`       | Build and start production server locally                                 |
| `yarn typecheck`     | Run TypeScript check                                                      |
| `yarn lint`          | Run ESLint                                                                |
| `yarn lint:fix`      | Run ESLint with auto-fix                                                  |
| `yarn format:check`  | Check Prettier formatting                                                 |
| `yarn format:write`  | Apply Prettier formatting                                                 |
| `yarn db:generate`   | Generate Drizzle migrations                                               |
| `yarn db:migrate`    | Run database migrations                                                   |
| `yarn db:seed`       | Seed database                                                             |
| `yarn db:setup-user` | Run DB setup for a user (e.g. `yarn db:setup-user <email> <full-name> <role>`) |
| `yarn e2e:install`   | Install Playwright browsers (run once before e2e tests)                  |
| `yarn e2e:test`      | Run Playwright e2e tests (headless)                                      |
| `yarn e2e:test:ui`   | Run Playwright e2e tests with UI                                         |
| `yarn email:dev`     | Start React Email dev server                                              |
