---
name: using-superpowers
description: Use when you need to choose a working process for a task, or when a skill is explicitly requested - the on-demand entry to the skill set. Skills are tools to load when they help, not a gate to pass before replying.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

# Choosing a process

Skills are tools you load when they help, not a gate you pass before replying. Classify the task, then load only what that level needs.

Classify by **impact, blast radius, reversibility, clarity of the request, and the evidence you already have**. File count, line count, and "this looks simple" are not criteria on their own.

| Level | Use for | Process |
|---|---|---|
| **A — Direct** | explanations, lookups, read-only analysis, plain copy edits | answer or do the small thing; no workflow, no narration |
| **B — Lightweight fix** | known behavior, contained scope, evidenced cause, reversible | confirm expected vs actual → locate the cause → smallest change → targeted verification → report. An authorized fix needs no second "go ahead" |
| **C — Standard** | ordinary features, several touch points, a few trade-offs | state the approach and the steps that matter, then design/TDD/review skills as needed |
| **D — Full** | new subsystems, architecture shifts, important interfaces or data models | full design, the confirmations that matter, a written plan, tests, review |

Not required at any level: questions the request and the code already answer; re-deriving an existing design or plan; re-confirming what is decided or authorized; plan/design documents, worktrees, or review subagents for contained A/B work.

When the level isn't clear, do a **bounded read-only investigation first**, then classify. Don't escalate because something *might* get complicated.

**Risk sets the floor.** These are at least C, and usually D, however small the diff: authentication or authorization; payments, billing, refunds, or money/rate thresholds; database schema, migrations, or data that cannot be un-mixed; a public API, event, or interface others depend on; production config, deploy paths, or shipping CI; security boundaries, secrets, or other people's data. A one-line change in that list is still D; a large mechanical change touching none of it can still be B.

**Project context comes first.** The project's own rules and docs (`CLAUDE.md`, `AGENTS.md`, `README`, `HANDOFF`, `docs/`) and its phase — prototype, active development, maintenance, legacy — set the default before this table does, and win over it. In unfamiliar or legacy code, look before you modify.

## Moving between levels

**Escalate when** scope grows, the change crosses modules, the cause is still unknown, verification is insufficient, or two fix attempts have failed. Then stop stacking patches: re-investigate and re-classify. A failure count is a trigger to investigate — never by itself evidence about the design, and never a reason to refactor.

**De-escalate when** the task turns out smaller than assumed: drop process you have **not yet executed**, with one line saying why — never verification or a risk control.

**Inherit context.** Follow-ups, added requirements, and review feedback inherit the existing design, plan, and authorization: handle the delta instead of restarting the interview. Re-design only when the scope genuinely changed.

## Loading skills

Load what the level needs, when you need it; "Using [skill] to [purpose]" keeps it visible. A skill already loaded and unchanged needs no second read. Skills shape how you work but never outrank your human partner: their instructions win over skills, and skills over your defaults.

## Evidence floor by level

**A** the answer is right, nothing to run · **B** a targeted check of the changed behavior — the test around it or the exact command — cited as run · **C** the behavior test for the change plus the tests around it · **D** the full suite for the area, the diff reviewed, and the risk controls the design named.

No assertable behavior, or genuinely not automatable here? Use the honest alternative — build, static check, screenshot, documented manual reproduction — and say what it does not cover. **A file type is never the reason**: configuration and generated files routinely carry permission, routing, money, and contract behavior. Claim scope and evidence validity: `superpowers:verification-before-completion`.

## What never changes with the level

1. **No blind fixes.** A fix needs located evidence or a testable hypothesis; if you cannot reproduce reliably, say so and add observation instead of claiming a root cause.
2. **Verification matches the change** — the floor above. For behavior defects, a failing test first, or a recorded failure in this same code state.
3. **Legitimate alternatives.** Nothing to assert — prose, styling, generated output, genuinely un-automatable work — is verified by build, static check, screenshot, or a documented manual reproduction. Don't invent tests for form's sake, and don't use the exemption to skip behavior that is in fact assertable.
4. **Claims match evidence.** Partial checks are not a full regression; local green is not a production fix.
5. **No green-washing.** Never delete tests, weaken assertions, or swallow failures to manufacture a pass.
6. **Authorization still applies.** Unrelated refactors, external writes, deploys, and destructive operations stay inside the authorization you have.

Evidence stays valid while the version, environment, and dependencies are unchanged; reuse it instead of re-running it. Once a change invalidates it, re-run the affected checks. Verification is not a per-message ritual.

**No ceremony.** Don't produce a plan, design doc, confirmation, todo list, or subagent dispatch the level does not need — process is not evidence of care, and manufacturing it costs your human partner time.

## Common misclassifications

| Thought | Reality |
|---|---|
| "It's only a few lines" | Size is not impact. A one-line money or permission change is level D. |
| "It's just a config/generated file" | Verify the behavior it carries. The extension decides nothing. |
| "The user said it's simple" | A signal, not the classification. |
| "It might be complicated, go heavy" | Do a bounded read-only check, then classify. |
| "We have plans, but let me re-interview first" | Inherited context: handle the delta. |
| "This keeps failing, so the architecture is wrong" | A failure count is an investigation trigger. Find the coupling, interface, or state evidence first. |
| "The skill exists, so I must run it" | Skills are tools. Load the ones this level needs. |

## Platform Adaptation

If your harness appears here, read its reference file for special instructions:

- Codex: `references/codex-tools.md`
- Pi: `references/pi-tools.md`
- Antigravity: `references/antigravity-tools.md`
- Hermes Agent: `references/hermes-tools.md`
