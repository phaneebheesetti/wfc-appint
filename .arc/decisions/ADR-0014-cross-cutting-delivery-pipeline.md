---
id: ADR-0014
category: cross_cutting
title: 'Cross-cutting: Delivery pipeline'
status: accepted
superseded_by: null
component_id: null
decision: GitHub Actions lint/format/typecheck on PRs to staging and main; E2E (Playwright)
  job exists but disabled; Heroku deploys from branch.
evidence: docs/infrastructure.md; .github/workflows/ci.yml
---

## Context

docs/infrastructure.md; .github/workflows/ci.yml

## Decision

GitHub Actions lint/format/typecheck on PRs to staging and main; E2E (Playwright) job exists but disabled; Heroku deploys from branch.
