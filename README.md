# WFCentral Fundraising App

Web app for running chocolate-based fundraisers from end to end. Organizers handle campaign setup, participant management, and reporting, with built-in integrations for payments, communications and much more.

## Documentation

The **canonical** documentation index and suggested reading order live in **[Documentation index](docs/README.md)**. The links below mirror that set for quick access from the repository root.

- **[Codebase](docs/codebase.md)** — Tech stack, local setup (prerequisites, running the app), scripts, and auth.
- **[Application architecture](docs/architecture-diagram.md)** — High-level request flow and diagram (client → tRPC → services → DB and external services).
- **[Infrastructure](docs/infrastructure.md)** — Deployment (Heroku, branches, Procfile) and environments (URLs).
- **[Database](docs/database.md)** — Schema location, migrations, seed, env.
- **[Testing](docs/testing.md)** — E2E (Playwright), CI, and pointer to e2e/README.
- **[Third-party integrations](docs/third-party-services/README.md)** — How key services are used in the codebase.
- **[Third-party services and handoff](docs/third-party-services/third-party-services-integrations-handoff.md)** — Service list and handoff checklist.
- **[Pre-launch](docs/pre-launch.md)** — Checklist before production deploy.
- **[Post-launch](docs/post-launch.md)** — Checklist after production deploy.
- **[Architecture evolution / product hardening](docs/architecture-evolution-product-hardening.md)** — Forward-looking optimizations and refactoring priorities.
- **[Glossary](docs/glossary.md)** — Domain and code terms, including code↔UI renames (e.g. campaign→Fundraiser, sales_representative→Fundraising Consultant).
