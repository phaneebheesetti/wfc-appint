# Glossary

This doc defines domain and code terms used in the WFC app and documentation. Terms are grouped for clarity. For code↔UI renames, see the "Code vs UI / domain renames" section.

## Product and stakeholders

- **WFC** — World's Finest Chocolate; the product/brand this app supports.
- **AE** — Agency Enterprise; current owner of repo and several third-party accounts (see [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md)).

## Code vs UI / domain renames (from codebase)

- **Campaign** — In code and DB: a single fundraising run (table `campaigns`). In the UI and user-facing copy this is labeled **Fundraiser** (e.g. "Create a fundraiser", "Fundraiser participants").
- **Sales representative / SALES_REPRESENTATIVE** — Role in code (`RolesEnum.SALES_REPRESENTATIVE`). In the UI the label is **Fundraising Consultant** ([src/constants/roles.tsx](../src/constants/roles.tsx)).
- **Sponsor** — The user who runs a given fundraiser; `campaigns.sponsorId` references that user. Shown in reports and filters as "Sponsor".
- **Organization** — A school, team, or group that runs fundraisers; table `organizations`. Roles like **Organization Admin** and **Organization Staff** manage it.
- **Participant** — A user (e.g. student) who sells in a fundraiser; `PARTICIPANT` role; membership in `campaigns_users` per fundraiser.
- **Parent** — A user (e.g. parent/guardian) linked to participants; `PARENT` role.
- **Case** — Unit of chocolate product; e.g. case checkout, case delivered. Used in `cases_goal`, `cases_transactions`, and prize/event goals.
- **Permission slip** — Document type for participant consent; optional "digital permission slip" per campaign.

## Tech and infra

- **RLS** — Row Level Security (Supabase/Postgres); policies restrict rows by role/claims; the app sets these per request via middleware.
- **tRPC** — Type-safe API layer between frontend and backend; procedures call into services.
- **Clerk** — Auth provider; sign-in, sessions, JWT claims (`user_id`, `user_role`).
- **Supabase** — Hosted Postgres for the app database and RLS; **auth is Clerk**, not Supabase Auth. The app also uses Supabase **Storage** where documented (e.g. uploads). Realtime product traffic may use other vendors (e.g. Ably) alongside Postgres.
- **Drizzle** — ORM used for schema, migrations, and app CRUD.
- **Heroku** — App hosting; staging and production apps and pipelines.
- **Sentry** — Error monitoring; DSN and config in env.
- **PostHog** — Product analytics and feature flags.
