---
name: pr-ready
description: This skill should be used when the user says "/pr-ready", "is this ready for a PR", "pre-PR check", "check before opening a PR", "run PR readiness", or has finished feature work on a branch and wants it validated end-to-end (static checks, affected-route QA, PR description) before opening or updating a GitHub pull request.
version: 1.0.0
---

# PR Readiness Check

Runs the WFC pre-PR gate end-to-end: static checks, an agentic browser QA pass over the routes/roles the diff actually touches, and a generated PR description — then opens or updates the PR only after the user explicitly confirms. Do not skip a phase or soften a gate to "probably fine" — each phase has a pass/fail condition below and the workflow must stop, not proceed silently, when one fails.

## Phase 0 — Context gather

1. `git branch --show-current` and `git status` (working tree should be clean or the user should confirm uncommitted changes are intentional).
2. Determine the diff base: try `git merge-base HEAD origin/staging`, fall back to `origin/main` if staging doesn't exist locally. Fetch first (`git fetch origin staging main`) if the merge-base call fails.
3. `git diff <base>...HEAD --name-only` — this file list drives every later phase. If empty, stop and tell the user there's nothing to check.
4. Extract a ticket reference from the branch name (patterns seen in this repo: `feature/WFAL-754-...`, `feature/796-...`, `feature/788-796-...`). If no ticket-like token is found, ask the user for the Jira ticket ID/title once rather than guessing.

## Phase 1 — Static gate (must match CI exactly)

Run in parallel: `yarn format:check`, `yarn lint`, `yarn typecheck`.

- **On failure**: per user preference, auto-fix first — run `yarn format:write` and `yarn lint:fix`, then re-run all three checks once. Report anything `lint:fix`/`format:write` could not resolve (e.g. typecheck errors, lint errors requiring manual fixes) and stop there until the user fixes or explicitly says to proceed anyway.
- **Pass condition**: all three commands exit 0 (after at most one auto-fix pass). This is a hard gate — do not proceed to Phase 2 on failure.

## Phase 2 — Impact mapping

From the Phase 0 file list, identify:

- Which `src/app/**` routes are touched (directly, or via a shared component/layout/action they import — check importers with Grep if a shared file changed).
- Which of the 7 Clerk roles can reach each affected route. Determine this by reading the relevant `layout.tsx`/middleware/route-guard logic for that route rather than assuming — role gating is enforced in code, not by naming convention.
- If a changed file affects no reachable UI route (e.g. a backend script under `scripts/`, an admin script, a pure API route with no UI), note it explicitly as "no browser QA applicable" rather than silently dropping it.

**Pass condition**: every file from Phase 0 is accounted for — either mapped to a route+role set, or explicitly marked not applicable with a one-line reason.

## Phase 3 — Agentic QA pass

For each affected route/role pair from Phase 2, use the **`run`** skill to drive the app in a real browser and verify the flow. Reuse the project's existing E2E test identity infrastructure rather than inventing new test accounts:

- Test users and their roles are defined in `e2e/auth.setup.ts` / documented in `e2e/README.md` — one fixed test email per role (`e2e_<role>+clerk_test@example.com`), Clerk test verification code `424242`.
- For each role that needs testing, sign in as that role's test user, navigate to each affected route for that role, and check for: page load success (no 5xx/error boundary), zero browser console errors, zero failed same-origin API requests (4xx/5xx). Capture a screenshot per route/role as evidence.
- If a route requires state that doesn't exist yet in the dev DB (e.g. a specific org/participant record), note the gap explicitly rather than skipping the check silently.

**Pass condition**: every route/role pair from Phase 2 has a logged result (pass, fail, or explicit blocker) — zero silent omissions. Any fail or blocker is surfaced to the user before Phase 4; ask whether to proceed anyway or fix first.

## Phase 4 — Synthesis

Draft a PR description with:

1. Summary (1-3 sentences, referencing the ticket ID/title from Phase 0).
2. Files changed, grouped by area, each with a one-line purpose.
3. QA results table: route × role × result (pass/fail/blocker) from Phase 3, with screenshot references.
4. Test plan checklist a reviewer can follow.

**Pass condition**: every file from the Phase 0 diff list appears somewhere in section 2 — self-check by comparing `git diff --name-only` against the drafted description before showing it to the user.

## Phase 5 — Confirm, then ship

Show the user: Phase 1 results, Phase 2/3 coverage table, and the drafted PR description. Ask explicitly whether to open a new PR (`gh pr create`) or update an existing one (`gh pr edit`) with this description.

**Do not run `gh pr create` or `gh pr edit` without an explicit go-ahead in this run** — a prior approval in an earlier session does not carry over. If the user requests changes to the description or wants to fix a QA failure first, loop back to the relevant phase rather than shipping partial results.
