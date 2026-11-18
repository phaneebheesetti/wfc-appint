# Documentation index

This documentation is for developers, DevOps, and teams taking over the project. It covers local setup, architecture, infrastructure, database, testing, third-party integrations, and pre- and post-launch checklists. For a visual of request flow, see [Application architecture](architecture-diagram.md). This set was written to support onboarding, handoff, and release so the next team can run and evolve the app with confidence.

**What's included**

- Tech stack, codebase structure, API design, and security
- Application architecture with request-flow and sequence diagrams
- Infrastructure: deployment, CI/CD, environments, and monitoring
- Database: schema, migrations, seed, RLS/`authorize`, complex-query pointers, and Supabase JS client split
- Testing: E2E strategy and pointer to e2e setup
- Third-party integrations: in-app usage guides (Supabase, Clerk, Stripe, Ably, SendGrid, Twilio) plus handoff for 13 services
- Pre-launch and post-launch checklists with time estimates
- Prioritized architecture evolution and product-hardening topics
- [Glossary](glossary.md) of domain and code terms (e.g. campaign vs Fundraiser, roles)

## All docs

| Doc | Purpose |
| --- | ------- |
| [Codebase](codebase.md) | Tech stack, codebase structure, tRPC API, state, security, prerequisites, and scripts. |
| [Application architecture](architecture-diagram.md) | High-level request flow and diagrams (client → tRPC → services → DB and external services). |
| [Infrastructure](infrastructure.md) | Deployment (Heroku), environments, CI/CD, env vars, and monitoring (Sentry, PostHog). |
| [Database](database.md) | Schema, migrations, seed, RLS policies and `authorize`, Drizzle query example, Supabase clients vs Drizzle, DB scripts. |
| [Testing](testing.md) | E2E strategy (Playwright), test scripts, and pointer to e2e/README. |
| [Third-party integrations](third-party-services/README.md) | How Supabase, Clerk, Stripe, Ably, SendGrid, and Twilio are used in code (diagrams, env vars, entry points). |
| [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md) | Service list, ownership, and handoff checklist with transfer steps. |
| [Pre-launch](pre-launch.md) | Checklist to complete before deploying to production. |
| [Post-launch](post-launch.md) | Checklist to run after each production deploy. |
| [Architecture evolution / product hardening](architecture-evolution-product-hardening.md) | Prioritized technical debt and refactoring topics for the next team. |
| [Glossary](glossary.md) | Domain and code terms, including code↔UI renames (e.g. campaign→Fundraiser, sales_representative→Fundraising Consultant). |

## Suggested reading order

- **New developer:** [Codebase](codebase.md) → [Glossary](glossary.md) → [Application architecture](architecture-diagram.md) → [Database](database.md) → [Third-party integrations](third-party-services/README.md) → [Testing](testing.md)
- **Handoff / DevOps:** [Third-party services and handoff](third-party-services/third-party-services-integrations-handoff.md) → [Infrastructure](infrastructure.md)
- **Release:** [Pre-launch](pre-launch.md) → [Post-launch](post-launch.md)
