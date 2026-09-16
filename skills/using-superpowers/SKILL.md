---
name: using-superpowers
description: Use when you need to choose a working process for a task, or when a skill is explicitly requested - the on-demand entry to the skill set. Skills are tools to load when they help, not a gate to pass before replying.
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

# Choosing a process

Skills are tools you load when they help, not a gate you pass before replying. Classify the task first, then load only what that level needs.

Classify by **impact, blast radius, reversibility, clarity of the request, and the evidence you already have**. File count, line count, and "this looks simple" are not classification criteria on their own.

| Level | Use for | Process | Not required |
|---|---|---|---|
| **A — Direct** | explanations, lookups, read-only analysis, plain copy edits | answer, or do the small thing | no development workflow, no process narration; specialty skills only when they genuinely help or your human partner asks |
| **B — Lightweight fix** | known behavior, contained scope, evidenced cause, reversible | confirm expected vs actual → locate the cause → smallest change → targeted verification → report | no design/plan documents, no per-item todo ceremony, no worktree, no review subagents. When your human partner already asked for the fix, the implementation is authorized — don't wait for a second "go ahead" |
| **C — Standard** | ordinary features, several touch points, a few design trade-offs | short approach plus the steps that matter, then design/plan/TDD/review skills as needed | don't ask about what the request and the code already answer; reuse an existing design or plan instead of re-deriving it |
| **D — Full** | new subsystems, architecture shifts, important interfaces or data models; permissions, money, sensitive data, irreversible migrations | full design, the human confirmations that matter, a written plan, tests, review | risk does not mean re-confirming every step. Confirm only what is still undecided or unauthorized |

When the level isn't clear from what you have, do a **bounded read-only investigation first**, then classify. Don't escalate to the heaviest process because something *might* get complicated.

## Moving between levels

**Escalate when** scope grows, the change crosses modules, the cause is still unknown, verification is insufficient, or two fix attempts have failed. Then stop stacking patches: re-investigate and re-classify. That is not by itself evidence of an architecture problem, and it does not authorize a refactor.

**De-escalate when** investigation shows the task is smaller than assumed. You may drop process you have **not yet executed**, with one line saying why. Never drop verification or risk controls that way.

**Inherit context.** Follow-up fixes on the same problem, added requirements, and review feedback inherit the existing design, plan, and authorization. Handle the delta; don't restart the requirements interview. Re-design only when the scope genuinely changed.

## Loading skills

- Load the skills the chosen level needs, when you need them. A one-line "Using [skill] to [purpose]" keeps this visible to your human partner.
- A skill already loaded in this session and unchanged does not need reading again. Re-read it when context was lost, the skill changed, or you need its exact wording.
- Skills shape how you work; they do not outrank your human partner. User instructions (CLAUDE.md, AGENTS.md, direct requests) win over skills, and skills win over default behavior.

## What never changes with the level

1. **No blind fixes.** A fix needs located evidence or a testable hypothesis. If you cannot reproduce reliably, say so and add targeted observation — don't claim a root cause you haven't shown.
2. **Verification matches the change.** For behavior defects, get a failing test covering the problem first, or reuse one that already exists.
3. **Legitimate alternatives.** Copy, styling, configuration, generated output and hard-to-automate work can be verified by build, static checks, screenshot comparison, or a documented manual reproduction. Don't invent tests for form's sake.
4. **Claims match evidence.** Partial checks are not a full regression; local green is not a production fix.
5. **No green-washing.** Never delete tests, weaken assertions, or swallow failures to manufacture a pass.
6. **Authorization still applies.** Unrelated refactors, external writes, deploys, and destructive operations stay inside the authorization you actually have.

Evidence stays valid while the version, environment, and dependencies are unchanged — reuse it rather than re-running it. Once a change invalidates it (code, dependencies, environment, version), re-run the affected checks. Verification is not a per-message ritual.

## Common misclassifications

| Thought | Reality |
|---|---|
| "It's only a few lines" | Size is not impact. A one-line money or permission change is level D. |
| "The user said it's simple" | That framing is a signal, not the classification. |
| "It might be complicated, go heavy" | Do a bounded read-only check, then classify. |
| "We have a plan, but let me re-interview first" | Inherited context: handle the delta. |
| "No test is possible, so there is nothing to verify" | Find the honest alternative, and say what you did not verify. |
| "The skill exists, so I must run it" | Skills are tools. Load the ones this level needs. |

## Platform Adaptation

If your harness appears here, read its reference file for special instructions:

- Codex: `references/codex-tools.md`
- Pi: `references/pi-tools.md`
- Antigravity: `references/antigravity-tools.md`
- Hermes Agent: `references/hermes-tools.md`
