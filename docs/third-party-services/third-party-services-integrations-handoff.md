# Third-party services / integrations handoff checklist

This doc describes third-party service accounts and the handoff checklist for transferring ownership.

The receiving team will get **ownership** of the following accounts.
Everything is already configured and running.
For the documentation index and reading order, see [Documentation index](../README.md). For local setup, prerequisites, scripts, and testing commands, see [Codebase](../codebase.md). For a short repository overview, see the [root README](../../README.md).

For each service, the **outgoing team** checks **Sent** when they have transferred access; the **receiving team** checks **Received** when they have access and can manage the account.

## Third-party services (quick reference)

### Owned by AE


| Service                                                                                                                                                 | Purpose                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [GitHub](https://github.com/agencyenterprise/wfc)                                                                                                       | Source code repository                                                      |
| [Heroku](https://dashboard.heroku.com/pipelines/3004945d-2973-4887-bc8c-b42e8cc93d7c)                                                                   | App hosting and deployment                                                  |
| [Supabase](https://supabase.com/dashboard/project/umezhomcbnjtjbqvtxyp)                                                                                 | Hosted Postgres database                                                    |
| [Clerk](https://dashboard.clerk.com/apps/app_2swSYipity9ZBVhwsCedXDsC4aA/instances/ins_2t0NfBkeSTw0CEfN915X1ezOHyU)                                     | User auth and sessions                                                      |
| [Sentry](https://ae-studio-xs.sentry.io/issues/?project=4509038387593216)                                                                               | Error monitoring and reporting                                              |
| [PostHog](https://us.posthog.com/project/142744)                                                                                                        | Analytics and feature flags                                                 |
| [Ably](https://ably.com/accounts/66126)                                                                                                                 | Real-time data                                                              |
| [Google Cloud](https://console.cloud.google.com/welcome?invt=AbuYhw&project=wfc-fundraising)                                                            | Sign in with Google (OAuth credentials for Clerk)                           |
| [Google Search Console](https://search.google.com/search-console?utm_source=about-page&resource_id=sc-domain:fundraising-app.worldsfinestchocolate.com) | Search performance and indexing (fundraising-app.worldsfinestchocolate.com) |


### Owned by WFC


| Service                                | Purpose              |
| -------------------------------------- | -------------------- |
| [Stripe](https://dashboard.stripe.com) | Payments and payouts |
| [SendGrid](https://app.sendgrid.com)   | Transactional email  |
| [Twilio](https://console.twilio.com)   | SMS sending          |


### Needs new account


| Service                                           | Purpose                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| [Handwriting OCR](https://www.handwritingocr.com) | Handwriting OCR API — **disabled**; new account required (key in Heroku) |


---

## 1. GitHub


| Field        | Details                                                                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Source code repository                                                                                                                                                                                |
| **URL**      | [GitHub – wfc](https://github.com/agencyenterprise/wfc)                                                                                                                                               |
| **Estimate** | 1–2 hours                                                                                                                                                                                             |
| **Reason**   | Transfer is simple; no scripts reference the repo URL; all settings are already in place.                                                                                                             |
| **How to**   | Repo Settings > Danger Zone > Transfer. Enter new owner (user or org). Target must accept within 24h. Redirects keep old clone URLs working; CI or scripts that reference repo URL may need updating. |
| **Concerns** | If target org is on GitHub Free, private repos lose protected branches, Pages. Read-only collaborators don't transfer to personal accounts.                                                           |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 2. Heroku


| Field                           | Details                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**                     | App hosting and deployment                                                                                                                                                                                                                                                                     |
| **URL**                         | [Heroku pipeline](https://dashboard.heroku.com/pipelines/3004945d-2973-4887-bc8c-b42e8cc93d7c)                                                                                                                                                                                                 |
| **Estimate**                    | 0.5–1 days                                                                                                                                                                                                                                                                                     |
| **Reason**                      | Core infra; must verify staging and production, pipelines, and all config vars; critical path for the rest of the handoff.                                                                                                                                                                     |
| **How to**                      | Transfer pipeline ownership first, then apps. CLI: `heroku apps:transfer -a <app> <recipient@email.com>`. Recipient must be collaborator or team member. Bulk: `heroku apps:transfer --bulk <email>`. Config vars and URLs stay. App env vars for staging and production are in Heroku config. |
| **Transfer to another company** | You can only transfer to a team you're a member of. **Other company must invite you to their Heroku team first** — then that team appears in the dropdown; select it and transfer.                                                                                                             |
| **Concerns**                    | Only current owner can initiate.                                                                                                                                                                                                                                                               |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 3. Supabase


| Field        | Details                                                                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Hosted Postgres database                                                                                                                                                                            |
| **URL**      | [Supabase project](https://supabase.com/dashboard/project/umezhomcbnjtjbqvtxyp)                                                                                                                     |
| **Estimate** | 0.5–1 days                                                                                                                                                                                          |
| **Reason**   | Prerequisites must be checked first; possible brief downtime; time to verify DB connections and that the app still works.                                                                           |
| **How to**   | Project Settings > General Settings > Project transfer. Transfer between organizations (not direct user-to-user). Source org owner initiates; target org member accepts. Project URL and keys stay. |
| **Concerns** | Prerequisites: no log drains, no project-scoped roles, no active GitHub integration; same region only. 1–2 min downtime possible when moving paid → free.                                           |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 4. Clerk


| Field        | Details                                                                                                                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | User auth and sessions                                                                                                                                                                                                                                     |
| **URL**      | [Clerk app](https://dashboard.clerk.com/apps/app_2swSYipity9ZBVhwsCedXDsC4aA/instances/ins_2t0NfBkeSTw0CEfN915X1ezOHyU)                                                                                                                                    |
| **Estimate** | 0.5–1 days                                                                                                                                                                                                                                                 |
| **Reason**   | Receiving team may need to create a Clerk workspace; billing setup if paid; time to verify login and session flows.                                                                                                                                        |
| **How to**   | Workspace dropdown > select app's workspace > Application Settings > Danger zone > **Transfer ownership**. Choose target workspace. API keys, settings, domains, config remain unchanged.                                                                  |
| **Concerns** | Target workspace must have billing info if app has paid subscription. Receiving team needs a Clerk workspace (create one if needed). Google Sign-In uses OAuth credentials from the Google Cloud project; see [Google Cloud](#8-google-cloud) for handoff. |


**App configuration:** The app expects custom session/JWT claims `user_id` and `user_role` (configure in Clerk: JWT template or session custom claims).

- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 5. Sentry


| Field        | Details                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Error monitoring and reporting                                                                                                         |
| **URL**      | [Sentry – wfc project](https://ae-studio-xs.sentry.io/issues/?project=4509038387593216)                                                |
| **Estimate** | 1-2 hours                                                                                                                              |
| **Reason**   | Transfer plus DSN and auth token updates in Heroku; verify error reporting in staging/production.                                      |
| **How to**   | Project Settings > General Settings > Transfer Administration > Transfer project. Enter target org owner email. They accept via email. |
| **Concerns** | Same region only. DSN may change — update `NEXT_PUBLIC_SENTRY_DSN` and auth token in Heroku.                                           |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 6. PostHog


| Field        | Details                                                                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Analytics and feature flags                                                                                                                                                            |
| **URL**      | [PostHog project](https://us.posthog.com/project/142744)                                                                                                                               |
| **Estimate** | 0.5–1 days                                                                                                                                                                             |
| **Reason**   | May require temporary upgrade and second project; then update `NEXT_PUBLIC_POSTHOG_KEY` and host in Heroku; verify analytics and feature flags.                                        |
| **How to**   | Project Settings > move project to another organization. Originating org must have at least 2 projects (free tier has 1). May need temporary upgrade + second project before transfer. |
| **Concerns** | `NEXT_PUBLIC_POSTHOG_KEY` and host may need updating in Heroku after move.                                                                                                             |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 7. Ably


| Field        | Details                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Real-time data                                                                                                                                                             |
| **URL**      | [Ably account](https://ably.com/accounts/66126)                                                                                                                            |
| **Estimate** | 1–2 hours                                                                                                                                                                  |
| **Reason**   | New owner must be made admin first; 2FA setup if required; verify real-time features after transfer.                                                                       |
| **How to**   | Account Settings > Danger Zone > **Transfer ownership**. New owner must be admin first (invite via Users, set as admin). New owner must enable 2FA if account enforces it. |
| **Concerns** | None                                                                                                                                                                       |


**How it works:** Channels per campaign/context; server publishes messages; client subscribes via the provider in `src/providers/messaging-provider.tsx`.

- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 8. Google Cloud


| Field        | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | The GCP project is used only to provide OAuth 2.0 credentials for **Sign in with Google** with Clerk. No other GCP services are in use for this app.                                                                                                                                                                                                                                                                                                                                               |
| **URL**      | [Google Cloud Console – wfc-fundraising](https://console.cloud.google.com/welcome?invt=AbuYhw&project=wfc-fundraising)                                                                                                                                                                                                                                                                                                                                                                             |
| **Estimate** | 0.5–1 days                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Reason**   | Handoff is about IAM, billing, and preserving the OAuth consent screen and OAuth 2.0 credentials so Clerk’s Google Sign-In keeps working. Client ID and Client Secret live in the Clerk Dashboard (SSO connections), not in Heroku.                                                                                                                                                                                                                                                                |
| **How to**   | **Option A:** Add receiving team as Owner (IAM > Add principal > Owner). **Option B:** Migrate project via Resource Manager (`gcloud beta projects move` or console). Requires `resourcemanager.projectMover` on both orgs; set org policies `allowedExportDestinations` / `allowedImportSources`. Billing does NOT auto-transfer — change in Billing > Change billing. The only resources to preserve are the OAuth consent screen and OAuth 2.0 Client ID; Clerk holds the Client ID and Secret. |
| **Concerns** | For production, the Google OAuth app must be set to “In production” (not “Testing”) on the OAuth consent screen; Google may require verification. If any service accounts or API keys exist in the project, they may need re-sharing.                                                                                                                                                                                                                                                              |


**What’s in use (Sign in with Google only)**

- **APIs & Services > OAuth consent screen** — App name, logo, user type (External for production), support email, scopes. For production, publishing status must be “In production”.
- **APIs & Services > Credentials** — OAuth 2.0 Client ID (Web application) with Authorized redirect URIs and Authorized JavaScript origins used by Clerk. Client ID and Secret are configured in Clerk Dashboard (SSO connections > Google > Use custom credentials).
- No other GCP APIs or products (Identity Platform, Firebase, Cloud Storage, etc.) are required for this integration.
- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 9. Google Search Console


| Field        | Details                                                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Search performance and indexing for fundraising-app.worldsfinestchocolate.com                                                                                                                                           |
| **URL**      | [Google Search Console – fundraising-app](https://search.google.com/search-console?utm_source=about-page&resource_id=sc-domain:fundraising-app.worldsfinestchocolate.com)                                               |
| **Estimate** | 0.5–1 days                                                                                                                                                                                                              |
| **Reason**   | Add user and verify access; if full transfer, DNS/HTML verification and removing old owner.                                                                                                                             |
| **How to**   | Settings > Users and permissions > Add user. Grant Owner or Full user. Property stays; no URL/verification changes. For full transfer: add delegated owner, or have new owner verify via DNS/HTML and remove old owner. |
| **Concerns** | Domain-level property; verification is tied to domain control.                                                                                                                                                          |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 10. Stripe


| Field         | Details                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**   | Payments and payouts                                                                                                                                                                       |
| **URL**       | [Stripe dashboard](https://dashboard.stripe.com)                                                                                                                                           |
| **Ownership** | WFC                                                                                                                                                                                        |
| **Estimate**  | Unknown                                                                                                                                                                                    |
| **Reason**    | WFC must invite the team; coordination and response time add calendar days. Once invited, verify webhooks and API keys.                                                                    |
| **How to**    | Ask WFC to invite the receiving team to the account (Team settings > Add user). WFC adds recipients as Admin or appropriate role. Same account = same API keys, webhooks — no env changes. |
| **Concerns**  | Receiving team depends on WFC to grant and maintain access.                                                                                                                                |


**Monitor webhook delivery:** Stripe Dashboard → Developers → Webhooks.

- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 11. SendGrid


| Field         | Details                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**   | Transactional email sending                                                                                                                    |
| **URL**       | [SendGrid](https://app.sendgrid.com)                                                                                                           |
| **Ownership** | WFC                                                                                                                                            |
| **Estimate**  | Unknown                                                                                                                                        |
| **Reason**    | WFC must invite the team; Once invited, verify email delivery and API key.                                                                     |
| **How to**    | Ask WFC to invite the receiving team to the account. WFC adds recipients as users with appropriate permissions. Same API key — no env changes. |
| **Concerns**  | Receiving team depends on WFC to grant and maintain access.                                                                                    |


**Monitor delivery:** SendGrid → Activity.

- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 12. Twilio


| Field         | Details                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**   | SMS sending                                                                                                                                                                                                           |
| **URL**       | [Twilio console](https://console.twilio.com)                                                                                                                                                                          |
| **Ownership** | WFC                                                                                                                                                                                                                   |
| **Estimate**  | Unknown                                                                                                                                                                                                               |
| **Reason**    | WFC must invite the team; coordination and response time add calendar days. Once invited, verify SMS sending and API keys/phone number.                                                                               |
| **How to**    | Ask WFC to invite the receiving team to the account (Twilio console: add users / team). WFC adds recipients with appropriate permissions. Same account = same Account SID, auth token, phone number — no env changes. |
| **Concerns**  | Receiving team depends on WFC to grant and maintain access. If they later want their own account, phone number porting is a separate process.                                                                         |


- **Sent:** Access / ownership transferred to receiving team
- **Received:** We have access and can manage this account

---

## 13. Handwriting OCR (handwritingocr.com)


| Field        | Details                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**  | Handwriting OCR API                                                                                                                                                                                                 |
| **Status**   | **Disabled.** This service is currently disabled. A new account needs to be created for the receiving team.                                                                                                         |
| **URL**      | [handwritingocr.com](https://www.handwritingocr.com) (no shared dashboard; API key would go in Heroku config)                                                                                                       |
| **Estimate** | Unknown                                                                                                                                                                                                             |
| **Reason**   | New account: signup at handwritingocr.com, generate API key, set `HANDWRITING_OCR_API_KEY` in Heroku. Small vendor; support responsiveness unknown.                                                                 |
| **How to**   | Create a new account at handwritingocr.com, generate an API key, and set `HANDWRITING_OCR_API_KEY` in Heroku (staging and production). Re-enable any app features that depend on this API once the key is in place. |
| **Concerns** | None                                                                                                                                                                                                                |


- **Sent:** N/A — service disabled; receiving team creates new account
- **Received:** New account created, API key in Heroku, and handwriting OCR features verified (if re-enabled)

---

## Recommended Order for Handoff

1. **First:** [GitHub](#1-github)
2. **Core infra:** [Heroku](#2-heroku), [Supabase](#3-supabase), [Clerk](#4-clerk)
3. **Observability:** [Sentry](#5-sentry), [PostHog](#6-posthog)
4. **Realtime:** [Ably](#7-ably)
5. **Google:** [GCP](#8-google-cloud), [Search Console](#9-google-search-console)
6. **WFC-owned:** [Stripe](#10-stripe), [SendGrid](#11-sendgrid), [Twilio](#12-twilio)
7. **Last:** [Handwriting OCR](#13-handwriting-ocr-handwritingocrcom) (disabled — new account when needed)

---

## Environment variables

App configuration (env vars) for staging and production is stored in Heroku. When transferring Heroku, export or share config vars securely so the receiving team has a backup reference. Full schema: [src/env.js](../../src/env.js).

- **Sent:** Staging and production env vars shared securely with receiving team (e.g. Heroku export or secrets manager)
- **Received:** We have a copy of staging and production env vars

---

## Sign-off

- **Outgoing:** All accounts and env vars above have been transferred
- **Receiving:** We have access to all accounts and have confirmed. Contact(s) and handover period for follow-up questions agreed.

