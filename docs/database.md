# Database documentation

This doc describes where schema, migrations, and seed live, Supabase integration, and database scripts.

## Where things live

Key domains: users, organizations, campaigns, campaigns_users, organizations_users, payment_logs, events, documents, and others. See `src/server/db/schema/` for the full list.

| What       | Location                          |
| ---------- | --------------------------------- |
| Schema     | `src/server/db/schema/` (barrel `index.ts`) |
| Migrations | `supabase/public-migrations/` (Drizzle-generated) |
| Seed       | `src/server/db/seed.ts`           |
| First-time user | `src/server/db/setup.ts`   |

## Supabase DB integration

Drizzle ORM + postgres.js. Schema lives in repo; migrations are applied on deploy (release phase: see [infrastructure](infrastructure.md)). Migrations are reviewed in PR (schema + SQL). Run on staging before merging to main; release phase applies them on production deploy.

## Supabase DB access & roles

- DB is Supabase Postgres. App connects via connection strings: `DATABASE_URL` (runtime), `DATABASE_MIGRATIONS_URL` (migrations and seed).
- Use pooler URL for the app in serverless; use direct connection for migrations when required by Supabase.
- **Application tables:** Routine reads and writes use **Drizzle** over `DATABASE_URL` (see [`src/server/db/index.ts`](../src/server/db/index.ts)), not Supabase PostgREST. RLS still applies to that session when the request-scoped role and JWT claims are set (see below). Broader security: [Codebase – Security](codebase.md#security-principles).

## Row Level Security (RLS)

- RLS is enabled on app tables (Drizzle `.enableRLS()` flags schema; SQL source of truth is `supabase/public-migrations/`). The usual pattern is five policies per table: `*_select`, `*_insert`, `*_update`, `*_delete`, plus an optional `*_all` policy gated on a `*.all` value in the `app_permission` enum.
- Policies are **PERMISSIVE**, apply to Postgres role **`authenticated`**, and delegate to `public.authorize(<app_permission>)`. Expressions today do **not** restrict by row columns—the gate is **permission-based** via `role_permissions`, not “only my rows,” unless a future policy adds predicates.
- **`authorize()`:** `STABLE SECURITY DEFINER`; canonical implementation is [`supabase/public-migrations/0085_update_authorize.sql`](../supabase/public-migrations/0085_update_authorize.sql). It resolves `app_role` from `auth.jwt() ->> 'user_role'` and checks `role_permissions` (see [`0000_initial_setup.sql`](../supabase/public-migrations/0000_initial_setup.sql)) for the requested permission.
- **Request path:** tRPC [`userRoleMiddleware`](../src/server/api/middlewares/user-role-middleware.ts) wraps each procedure in a DB transaction, sets `request.jwt.claims` (JSON including `user_role` from Clerk-derived context), then `SET ROLE authenticated` when `userId` is present, else `SET ROLE anon`. That exposes the claims to `auth.jwt()` for RLS during queries on that transaction.
- **App vs DB permissions:** Align app-level checks with [`src/constants/role-permissions.ts`](../src/constants/role-permissions.ts). New DB permissions require `ALTER TYPE ... ADD VALUE` on `app_permission` in migrations.

**Example policy (SELECT on `campaigns_users`):**

```sql
CREATE POLICY "campaigns_users_select" ON "campaigns_users"
  AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ((SELECT public.authorize('campaigns_users.select'::public.app_permission) AS authorize));
```

## Supabase JS clients (Storage, service reads, etc.)

Supabase JavaScript clients cover **Storage**, **trusted server paths** that bypass RLS, and occasional typed access—not the default for everyday app table CRUD (Drizzle remains primary). Vars are validated in [`src/env.js`](../src/env.js).

| Factory | File | Primitive | Credentials | Typical use |
| ------- | ---- | --------- | ----------- | ----------- |
| Browser | [`src/lib/supabase/client.ts`](../src/lib/supabase/client.ts) | `createBrowserClient` (`@supabase/ssr`) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client components, e.g. [`image-upload.tsx`](../src/components/file-upload/image-upload.tsx) |
| Server (cookies) | [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts) | `createServerClient` (`@supabase/ssr`) | Same anon key; Next `cookies()` bridge | Server Storage with cookie-aware session, e.g. [`src/utils/campaigns.ts`](../src/utils/campaigns.ts) |
| Service role | [`src/lib/supabase/service-client.ts`](../src/lib/supabase/service-client.ts) | `createClient` (`@supabase/supabase-js`) | `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS: Stripe/signup API routes, some layouts—not default for app tables |

**Why three clients:** Anon + SSR matches Supabase’s Next.js recommendation; service role is for server-only code where RLS would block or where Supabase typings (`SupabaseUser`, etc.) are preferred for specific reads/writes.

## Example: complex read query

A representative multi-join, paginated read is [`campaigns-users-list-paginated-by-campaign-id.ts`](../src/server/services/campaigns-users/campaigns-users-list-paginated-by-campaign-id.ts). It answers: **paginated roster for a campaign**—`campaigns_users` joined to `users`, parent users, `organizations_users`, optionally `payment_logs` and `cases_transactions`, dynamic `WHERE`, and either an **aggregate** path (`GROUP BY`, order, `LIMIT`/`OFFSET`) or a non-aggregate path depending on sort. Count and page queries run in parallel via `Promise.all`, with follow-up batch loads. For a **subquery in `WHERE`** (`inArray` + `database.select(...)`), see [`campaigns-users-list-without-checkout-by-parent-id.ts`](../src/server/services/campaigns-users/campaigns-users-list-without-checkout-by-parent-id.ts).

## Soft delete

Tables `users`, `campaigns`, `organizations`, `payment_logs` use `deleted_at`. Deletes set `deleted_at` (and on users, `status = DELETED`); reads filter `deleted_at IS NULL` unless explicitly including deleted (e.g. admin user list).

## Env

DB: `DATABASE_URL`, `DATABASE_MIGRATIONS_URL`. Supabase JS: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. When adding env vars, update the schema in `src/env.js`.

## Database scripts (package.json)

`db:generate`, `db:migrate`, `db:seed`, and `db:setup-user` are documented with the rest of the project scripts in [Codebase – Scripts](codebase.md#scripts). Heroku runs `yarn db:migrate && yarn db:seed` on every deploy (release phase); see [Infrastructure](infrastructure.md).

## Viewing tables / diagram

Supabase Dashboard → Database: table list and ER-style diagram.
