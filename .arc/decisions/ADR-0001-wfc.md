---
id: ADR-0001
category: component
title: WFC
status: accepted
superseded_by: null
component_id: comp_wfc
responsibility: 'Next.js application at the repo root: App Router pages plus the tRPC
  API (/api/trpc), domain services (src/server/services), Stripe webhook route and
  Drizzle data access; runs on Heroku. API and UI ship as one deployable.'
kind: web_ui
split_reason: exists in the code
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: "docs/architecture-diagram.md: services \u2192 Drizzle \u2192 Supabase,\
    \ RLS via per-request claims"
evidence: docs/architecture-diagram.md; Procfile; src/app, src/server
---

## Context

docs/architecture-diagram.md; Procfile; src/app, src/server

## Decision

Next.js application at the repo root: App Router pages plus the tRPC API (/api/trpc), domain services (src/server/services), Stripe webhook route and Drizzle data access; runs on Heroku. API and UI ship as one deployable.

Kept separate because exists in the code.

## Talks to

- **Relational Database** (sync) — docs/architecture-diagram.md: services → Drizzle → Supabase, RLS via per-request claims
