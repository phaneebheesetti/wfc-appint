# Pre-Launch Checklist

This doc describes the checklist to complete before deploying to production.

Use this checklist before deploying to production. Work through sections in order. Each section has a short **Overview** for quick scanning and a **Description** with detailed steps.

---

## Code and build

**Overview:** Ensure the codebase is merged, builds, and passes checks.

**Description:** All PRs merged and reviewed. CI runs typecheck, lint, and format; run a full production build locally and a dependency audit.

- [ ] All PRs merged and reviewed
- [ ] CI checks pass (typecheck, lint, format)
- [ ] Production build succeeds locally

---

## Testing

**Overview:** Validate behavior with automated tests before go-live.

**Description:** Run E2E tests against staging or a production-like environment; optionally spot-check critical flows and target browsers. Strategy and scripts: [Testing](testing.md); env, auth, and CI details: [e2e/README.md](../e2e/README.md).

- [ ] E2E tests pass against staging or production-like environment

---

## Environment and config

**Overview:** Production env vars are set correctly and point to production.

**Description:** All required production env vars are set per your project’s env schema; no dev or staging secrets in production.

- [ ] All required env vars set (database, migration URLs, auth, third-party API keys, app URL)
- [ ] App URL(s) point to production
- [ ] No dev or staging secrets in production config

---

## Database

**Overview:** Migrations and seed are safe to run; production data is protected.

**Description:** Test migrations on staging first; ensure a production backup exists; define rollback if migrations are not backward-compatible.

- [ ] Migrations tested on staging
- [ ] Production DB backup exists or platform backups confirmed

---

## Third-party production setup

**Overview:** Each external service is configured for production.

**Description:** Auth, payments, email, SMS, analytics, and other integrated services use production instances and production keys; webhooks and redirect URLs point to production where applicable. In-app integration overview: [Third-party integrations](third-party-services/README.md); account transfer and dashboards: [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md).

- [ ] Production instances and keys in use for all integrated services
- [ ] Webhooks and redirect URLs point to production

---

## Security and compliance

**Overview:** No leaked secrets; auth and payments are secured.

**Description:** No secrets in repo or client bundle; HTTPS only; auth and role checks on protected routes; payment webhook signature verification in place; dependency vulnerabilities reviewed.

- [ ] No secrets in repo or client bundle
- [ ] App served over HTTPS only
- [ ] Auth and role checks enforced on protected routes
- [ ] Payment webhook signature verification in place

---

## Monitoring and alerts

**Overview:** Errors and analytics are captured; key alerts notify the team when something goes wrong.

**Description:** Error tracking and product analytics enabled; alerts configured for errors and availability; payment webhook delivery monitored. For Sentry and PostHog env and wiring, see [Infrastructure](infrastructure.md).

- [ ] Error tracking and product analytics receiving events from production
- [ ] Alerts configured for errors and app availability
- [ ] Payment webhook delivery failures monitored
