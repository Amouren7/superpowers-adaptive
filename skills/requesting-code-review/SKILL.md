---
name: requesting-code-review
description: Use when a change warrants an independent reviewer before it cascades - dispatched by risk, blast radius, and task level; level A and routine level B fixes do not start it unless review is explicitly requested
---

# Requesting Code Review

An independent reviewer catches issues before they cascade — when the change is worth an independent read. Dispatch one with precisely crafted context, never your session's history.

**Core principle:** Review where risk lives. Proportion the review to the change, never the ritual.

## When to Request Review

| Level | Do |
|-------|-----|
| **A — Direct** | no review, no reviewer |
| **B — Lightweight fix** | no reviewer subagent, by default. Your human partner asked for the fix; targeted verification is the check. Review only when they ask for it, or when the fix turns out to touch something you did not expect |
| **C — Standard** | on demand: dispatch when the change spans several touch points, alters an interface or data model, or you are unsure a fresh reader would follow it. Skip it for a contained change you verified directly. If a plan, a checklist, or your human partner requires review, that requirement wins |
| **D — Full** | required — before merge to the base branch, and at the checkpoints the plan names |

Also warranted at any level when your human partner or the project's process explicitly asks — when stuck, as a baseline before a refactor, or after a fix that was harder than it looked.

## How to Request

Match the scope to the risk: this work's diff is the default; a named subset when the risk is localized and the rest is mechanical; the whole branch for the final level D review; a single contested decision called out as a question. One reviewer per scope.

**1. Fix the range:**

```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main, or the plan's merge base
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch the reviewer:**

Dispatch with the subagent mechanism your harness provides, filling the template at [code-reviewer.md](code-reviewer.md). It is written for a general-purpose subagent.

**Placeholders:**
- `{DESCRIPTION}` - Brief summary of what you built
- `{PLAN_OR_REQUIREMENTS}` - What it should do
- `{BASE_SHA}` - Starting commit
- `{HEAD_SHA}` - Ending commit

Give it the range and the requirements. Not your reasoning, not your session — a reviewer handed your conclusions grades your conclusions instead of the code.

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Adjudicate before acting — verify a finding rather than implementing it because it was said (see `superpowers:receiving-code-review`)

## Example

```
[Completed: index verification + repair]

BASE_SHA=$(git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)

[Dispatch reviewer with the filled template]
  DESCRIPTION: Added verifyIndex() and repairIndex() with 4 issue types
  PLAN_OR_REQUIREMENTS: Task 2 from docs/superpowers/plans/deployment-plan.md
  BASE_SHA: a7981ec
  HEAD_SHA: 3df7661

[Reviewer returns]:
  Strengths: Clean architecture, real tests
  Issues:
    Important: Missing progress indicators
    Minor: Magic number (100) for reporting interval
  Assessment: Ready to proceed

You: [Fix progress indicators]
[Continue to Task 3]
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "It's simple, so it needs no review" | A level B fix you verified is fine without a reviewer. "Simple" is not a reason to skip review of a C or D change |
| "I'll just review the diff myself instead of dispatching a reviewer" | At C and D the coordinator reviewing inline burns the context you need to keep driving the work. Dispatch: the diff and the evaluation live in the reviewer's context, and only the findings come back. |
| "The reviewer needs my whole session history to understand the change" | Hand it precisely crafted context, never your session's history. That keeps the reviewer on the work product, not your thought process. |

## Red Flags

**Never:**
- Skip a review that the task level, the plan, or your human partner requires
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**Inverted failure — also never:**
- Dispatch a reviewer for a routine level B fix as ceremony

**If the reviewer is wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See template at: [code-reviewer.md](code-reviewer.md)

## Flow fit

- **Levels:** D requires review; C on demand (several touch points, interface, or data-model change); A and routine B do not trigger it.
- **Lightweight path:** B/contained C — targeted verification plus an honest report; no reviewer subagent, no second confirmation.
- **Skip when:** the change is reversible, evidenced, and you verified it directly — or review is being dispatched only to satisfy the ritual.
- **Non-negotiables:** Critical and Important findings get fixed or adjudicated before the work proceeds; every request carries a real range and the requirements, never your session history.
