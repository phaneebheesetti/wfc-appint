---
id: ADR-0011
category: cross_cutting
title: 'Cross-cutting: Authentication and authorization'
status: accepted
superseded_by: null
component_id: null
decision: Clerk session claims (user_id, user_role) feed tRPC context; userRoleMiddleware
  sets request.jwt.claims and SET ROLE per request so Postgres RLS enforces access.
  Stripe webhooks use the service-role client, bypassing RLS.
evidence: docs/architecture-diagram.md; docs/third-party-services/clerk.md
---

## Context

docs/architecture-diagram.md; docs/third-party-services/clerk.md

## Decision

Clerk session claims (user_id, user_role) feed tRPC context; userRoleMiddleware sets request.jwt.claims and SET ROLE per request so Postgres RLS enforces access. Stripe webhooks use the service-role client, bypassing RLS.
