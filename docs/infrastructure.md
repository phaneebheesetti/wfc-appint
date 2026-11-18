# Infrastructure documentation

This doc describes deployment (Heroku), environments, CI/CD, and environment variables.

## Deployment

- **Hosting**: Heroku pipeline; staging and production apps (URLs in [Environments](#environments) table).
- **Branch strategy**: Deploy from `staging` (staging app) and `main` (production). CI runs on PRs to these branches (see [Testing](testing.md)).
- **Procfile**: `web: yarn start`; **release phase**: `yarn db:migrate && yarn db:seed` on every deploy. Seed should be idempotent.
- **Config**: See [Environment variables & secrets management](#environment-variables--secrets-management) below. For access and handoff, see [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md).

## Environments

| Environment | URL                                                       |
| ----------- | --------------------------------------------------------- |
| Staging     | https://staging.fundraising-app.worldsfinestchocolate.com |
| Production  | https://fundraising-app.worldsfinestchocolate.com         |

## Heroku & environment access

- **Where**: Pipeline dashboard and CLI for config/logs (dashboard link in [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md)).
- **What**: Two apps (staging, production); config vars per app in Heroku Settings → Config Vars.
- **Handoff**: Transfer/ownership details in [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md).

## Environment variables & secrets management

- **Schema**: [src/env.js](../src/env.js) defines required vars; [.env.example](../.env.example) is the local reference.
- **Staging/production**: All app config in Heroku (Config Vars). `APP_URL` and `NEXT_PUBLIC_APP_URL` must match the deployed app URL.
- **CI**: GitHub repository secrets and environment-specific vars (`wfc-staging`, `wfc-prod`) for E2E and build; production secrets in CI only where needed for E2E (Clerk, PostHog, Ably per [ci.yml](../.github/workflows/ci.yml)).
- **Adding/rotating**: Heroku for app config; GitHub Settings → Secrets and variables → Actions for CI.

## CI/CD pipeline & release process

**CI:** GitHub Actions on PRs to `staging` and `main` ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) — lint, format, typecheck; uses GitHub environments `wfc-staging` / `wfc-prod`. E2E job exists but is disabled (`if: false`). E2E in CI is disabled by default; see [Testing](testing.md) and [Pre-launch](pre-launch.md) for when to run E2E and how to enable it.

**Release:** No deploy step in GitHub; Heroku deploys from branch (staging from `staging`, production from `main`). Release phase runs before each deploy: `yarn db:migrate && yarn db:seed` ([Procfile](../Procfile)); seed must be idempotent.

## Sentry & PostHog monitoring setup

**Sentry:** Error monitoring. DSN and options in [src/env.js](../src/env.js) (`NEXT_PUBLIC_SENTRY_*`). Enabled when `NEXT_PUBLIC_SENTRY_ENABLED=true`. API routes wrapped with `withSentry` ([src/utils/api.ts](../src/utils/api.ts)); provider and config in [sentry.client.config.ts](../sentry.client.config.ts), [sentry.server.config.ts](../sentry.server.config.ts), [sentry.edge.config.ts](../sentry.edge.config.ts). Dashboard link in [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md).

**PostHog:** Analytics and feature flags. Key and host in [src/env.js](../src/env.js); provider in app layout. Dashboard link in [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md).

## Supabase DB backup & restore validation

- **Backups**: Managed by Supabase (dashboard); point-in-time recovery depends on plan.
- **Where to check**: Supabase project → Database / Backups to confirm backups exist and retention.
- **Restore**: Via Supabase dashboard (restore from backup or PITR); no custom scripts in repo.
- **Validation**: Periodically confirm backups are present; optionally run a restore to a clone or staging to validate. Pre-launch checklist in [Pre-launch](pre-launch.md) includes “Production DB backup exists or platform backups confirmed”.
