---
id: ADR-0003
category: deployment_target
title: "Deployment target: Heroku pipeline with staging (staging branch) and production\
  \ (main) apps, one\u2026"
status: accepted
superseded_by: null
component_id: null
decision: Heroku pipeline with staging (staging branch) and production (main) apps,
  one web dyno process (`yarn start`), release phase runs db:migrate and db:seed;
  database on Supabase. Region topology not established.
evidence: docs/infrastructure.md; Procfile
---

## Context

docs/infrastructure.md; Procfile

## Decision

Heroku pipeline with staging (staging branch) and production (main) apps, one web dyno process (`yarn start`), release phase runs db:migrate and db:seed; database on Supabase. Region topology not established.
