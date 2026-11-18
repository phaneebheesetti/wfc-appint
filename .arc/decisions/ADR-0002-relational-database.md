---
id: ADR-0002
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Hosted Postgres with row-level security, accessed via Drizzle ORM
  and the Supabase service-role client; runs on Supabase; backups managed by Supabase.
kind: managed_service
split_reason: backing service the project uses but doesn't build
evidence: docs/third-party-services/supabase.md; docs/infrastructure.md; drizzle.config.ts
---

## Context

docs/third-party-services/supabase.md; docs/infrastructure.md; drizzle.config.ts

## Decision

Hosted Postgres with row-level security, accessed via Drizzle ORM and the Supabase service-role client; runs on Supabase; backups managed by Supabase.

Kept separate because backing service the project uses but doesn't build.
