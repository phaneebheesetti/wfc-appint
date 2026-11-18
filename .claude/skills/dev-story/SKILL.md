---
name: dev-story
description: This skill should be used when the user says "/dev-story", "implement this story", "develop this ticket end-to-end", or passes a Jira ticket key (e.g. WFAL-765) or a plain user-story description and wants it researched, broken into testable success criteria, built test-first (RED/GREEN), and re-verified in a loop that only stops when every criterion is met or a real human checkpoint is hit.
version: 2.0.0
---

# Dev Story — orchestrator for a parametrized research → TDD → verify loop

Takes one argument, `$ARGUMENTS`: either a Jira key matching `[A-Z]{2,10}-\d+` (e.g. `WFAL-765`) or a
plain user-story description. **You are the orchestrator** — dispatch the work below to the five
project subagents (`.claude/agents/`) via the Agent tool rather than doing their work yourself; your
job is sequencing, judging each output against its contract, looping back on gaps, and the final
human-facing report. Only terminate when every success criterion has a passing test and full
regression is green, **or** a genuine human checkpoint is hit. Never one-shot this.

**Scope boundary:** this skill ends at "implementation done, tests green, criteria met, human
notified." It does not open a PR or run the browser QA pass — that's `/pr-ready`'s job, run after this
skill finishes, not instead of it.

## The subagents (dispatch via the Agent tool, `subagent_type` = the name below)

| Agent | Dispatched | Input | Output |
|---|---|---|---|
| `story-researcher` | once, Phase 1 | `$ARGUMENTS` | evidence dossier (`file:line` cited) |
| `requirements-analyst` | once, Phase 2 | dossier + original story text | numbered success criteria, or `NEEDS HUMAN DECISION` |
| `test-author` | once per criterion, Phase 4a | one criterion + relevant dossier excerpt | one RED `.unit.test.ts` + confirmation it fails right |
| `implementer` | once per criterion, Phase 4b | that RED test + patterns | GREEN confirmation, or cycle-budget-exhausted report |
| `test-validator` | once per validation pass, Phase 5 | "all criteria supposedly green" | coverage table + `COMPLETE` / `GAPS FOUND` |

You (the orchestrator) judge every subagent's output against its own contract before accepting it and
moving on — an output that doesn't meet its done-check gets re-dispatched with the gap named, not
silently accepted.

## Human checkpoints (the only valid stopping points besides full success)

Name the checkpoint explicitly when you hit one — state what's blocking, what was tried, and the
options. Never guess past one of these:
1. **Requirement ambiguity** — `requirements-analyst` returns `NEEDS HUMAN DECISION` for a criterion.
2. **Cycle budget exhausted** — `implementer` reports 3 failed attempts on the same RED test.
3. **Irreversible/destructive action required** — a DB migration, a prod-affecting change, deleting
   data, or anything no subagent here can undo with a normal git operation.
4. **Scope collision** — the ticket is already done/in-flight (verify against git history, not just the
   ticket's comments — WFAL-790 looked open but was already merged) or the fix would require changing
   code another in-flight change owns.

## Phase 0 — Intake (orchestrator does this directly, no subagent)

1. Parse `$ARGUMENTS`: a Jira-key match (`[A-Z]{2,10}-\d+`) is resolved by `story-researcher` itself in
   Phase 1 — you don't need to fetch anything here.
2. `git status` — working tree clean, or confirm uncommitted changes are intentional before branching.
3. **Verify this isn't already done** before going further: `git log --oneline --all --grep=<ticket>`
   and check the ticket's actual status/subtasks/comments for an already-merged PR reference. If you
   find one, confirm it against `git log` on `origin/staging`/`origin/main` (not just the ticket
   comment) — this is checkpoint 4, stop here if confirmed.
4. If not already on a feature branch for this story, create one from latest `staging`:
   `git fetch origin staging && git checkout -b feature/<ticket-or-slug>-<short-desc> origin/staging`.
   If already on the right feature branch, stay on it.

## Phase 1 — Research

Dispatch `story-researcher` with `$ARGUMENTS` verbatim. It resolves the Jira-key-vs-plain-text
question itself (using `yarn script:fetch-jira-issue <KEY>` for a Jira key), and returns the evidence
dossier. Judge its done-check: each source analyzed or explicitly flagged unreachable, every real
consumer traced (not just the one named), every claim cited `file:line`. Re-dispatch with the specific
gap named if it isn't.

## Phase 2 — Analyze → success criteria

Dispatch `requirements-analyst` with the dossier + the original story text. If it returns any
`NEEDS HUMAN DECISION` items, that's checkpoint 1 — stop and ask, do not proceed with an invented
interpretation. Otherwise take its numbered criteria list as the loop's exit condition — do not alter
it later without saying why.

## Phase 3 — TDD loop (per success criterion, in dependency order)

For each criterion:
1. Dispatch `test-author` with that one criterion + the relevant slice of the dossier. It also
   ensures the one-time unit-test scaffold exists (`playwright.unit.config.ts` + `test:unit` script) —
   no separate scaffold phase needed here. Confirm its RED test actually discriminates before accepting.
2. Dispatch `implementer` with that RED test + patterns from the dossier. If it reports
   cycle-budget-exhausted, that's checkpoint 2 — stop and report, do not re-dispatch a 4th time yourself
   either.
3. Before moving to the next criterion, sanity-check the implementer's own three-angle self-check
   (coincidence fix? matches the domain rule? breaks a traced consumer?) — if it flagged real doubt,
   resolve it with more evidence (re-dispatch `story-researcher` for the specific gap) before proceeding.

## Phase 4 — Validate

Once every criterion has a GREEN, dispatch `test-validator`. On `GAPS FOUND`, loop back to Phase 3 for
just the itemized gaps — not the whole story. Exit the loop only on `COMPLETE`.

## Phase 5 — Notify the human

Once `COMPLETE` (or an unresolved checkpoint is reached):
1. Write a short summary in chat: criteria → test mapping, files changed with a one-line purpose each,
   anything deferred to a checkpoint, and a reminder that `/pr-ready` is the next step.
2. Call `PushNotification` with a one-line, under-200-character, no-markdown message leading with the
   outcome — e.g. `"WFAL-765: all 3 criteria green, ready for /pr-ready"` or
   `"WFAL-765 blocked: cycle budget exhausted on criterion 2"`. Send exactly one notification per run,
   at the actual end (`COMPLETE` or an unresolved checkpoint) — not for intermediate progress.

## Guardrails
- You are the orchestrator — sequence, judge, loop back; don't do a subagent's job yourself.
- Cycle budget = 3 per success criterion (enforced inside `implementer`); stop-and-report beats churn.
- Ground every accepted output in its subagent's cited evidence — never wave through an unverified claim.
- Feature branch only — never commit to `staging`/`main` directly, never push, never open a PR (that's
  `/pr-ready`, human-gated).
- No secrets/PII in code, tests, or commit messages.
- Exactly one `PushNotification` per run, sent only at genuine completion or an unresolved checkpoint.
