# Post-Launch Checklist

This doc describes the checklist to run after each production deploy to verify the release.

See also [Pre-launch](pre-launch.md) and [Infrastructure](infrastructure.md) for prerequisites, CI/CD, and monitoring context.

Use after each production deploy to verify the release and keep the app healthy. Assumes pre-launch is done (monitoring, alerts, webhooks configured). Error tracking: [Sentry](third-party-services/third-party-services-integrations-handoff.md#5-sentry); analytics: [PostHog](third-party-services/third-party-services-integrations-handoff.md#6-posthog).

---

## Immediate (first 15–60 min)

- [ ] App loads at production URL
- [ ] Check error tracking for new errors ([Sentry](third-party-services/third-party-services-integrations-handoff.md#5-sentry))
- [ ] Confirm deploy and migrations completed
- [ ] Verify payment webhooks (and optionally one email/SMS)

---

## First 24–48 hours

- [ ] Monitor errors and review dashboards ([Sentry](third-party-services/third-party-services-integrations-handoff.md#5-sentry), [PostHog](third-party-services/third-party-services-integrations-handoff.md#6-posthog))
- [ ] Review app/infra metrics (memory, response time)
- [ ] Check payment and webhook delivery
- [ ] Check email/SMS delivery; triage and assign issues

---

## First week

- [ ] Establish baseline targets (error rate, latency)
- [ ] Fix or document known issues
- [ ] Review database and real-time usage
- [ ] Gather early user feedback
