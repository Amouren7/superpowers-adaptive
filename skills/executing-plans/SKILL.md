---
name: executing-plans
description: Use when an existing implementation plan should be carried out in a separate session with review checkpoints. Not for contained fixes, for work you already hold in this session's context, or for a plan whose steps no longer match the code.
---

# Executing Plans

## Flow fit

- **Levels:** C and D, when a plan already exists and is still accurate. B runs its own five steps; A never loads it.
- **Lightweight path:** for a short C plan, work its steps in order, verify each one, and report; checkpoints only where the plan names them.
- **Skip when:** A plan file was never written — you are not required to have one. Talk through the steps inline and proceed.
- **Non-negotiables:** deviations are reported, never silently absorbed; verification the plan specifies is never skipped.

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** Superpowers works better with access to subagents (Claude Code, Codex CLI, Codex App, Copilot CLI, and Gemini CLI all qualify; see the per-platform tool refs in `../using-superpowers/references/`). Use superpowers:subagent-driven-development when the plan's remaining tasks are genuinely independent of each other and the trade-off clearly pays for the extra coordination; when they are few or tightly coupled, working through them in this session is the cheaper, more reliable path. The tools existing is not by itself a reason to dispatch.

An existing plan is inherited context: don't re-interview, re-classify, or re-litigate what the plan or the design already settled, and treat new requirements or review feedback as a delta. Work only what remains, and say so when a step is genuinely wrong or the scope moved. A plan file is not a precondition — lighter work uses the steps you agreed on.

## The Process

### Step 1: Load and Review Plan
1. Decide the workspace: work in place by default. Use superpowers:using-git-worktrees only when isolation is actually needed — a long or risky change you may need to abandon, work that must run beside other work, or your human partner asking for it
2. Read plan file
3. Review critically - identify any questions or concerns about the plan
4. If concerns: Raise them with your human partner before starting
5. If no concerns: Create todos for the plan items and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Complete Development

After all tasks complete and verified, **only when this session actually did branch-lifecycle work** — you created a branch or worktree, or your human partner asked for a merge, commit, or PR — announce "I'm using the finishing-a-development-branch skill to complete this work." and use superpowers:finishing-a-development-branch. When the work stayed in place on the current branch with no such request, report the result and stop: don't open a branch-finishing flow nobody asked for.

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.** Two failed attempts on the same step is the escalation trigger: stop stacking patches, re-investigate, and say what you found.

## When the Plan No Longer Fits

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking
- A step's assumption is contradicted by the code you find

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
