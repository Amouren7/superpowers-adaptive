---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, or before committing or opening a PR - match the claim to the evidence you actually have. Covers what evidence covers which claim, and when existing evidence is still valid.
---

# Verification Before Completion

## Flow fit

- **Levels:** B, C, and D, whenever you are about to state that something works. Not A - answering a question or reporting a read-only finding is not a completion claim.
- **Lightweight path:** one check that matches the claim you are making, cited as it was run - no full regression suite for a typo fix.
- **Skip when:** you are not asserting anything about the state of the work, or you are explicitly reporting that something is unverified.
- **Non-negotiables:** never state a claim broader than the evidence covers (local ≠ production, partial ≠ full); say plainly what you did not or could not verify.

## Overview

**Core principle:** evidence before claims - and evidence that covers exactly the claim.

## The Iron Law

```
NO COMPLETION CLAIM WITHOUT EVIDENCE COVERING THAT CLAIM
```

## Evidence Scope and Validity

Two things have to line up: the **scope** of your claim and the **validity** of the evidence. Say what you verified, not more - one test file supports "this test file passes," not "the suite passes"; checked locally supports "passes locally," not "fixed for your human partner."

Evidence stays good while what it covered stays unchanged. It survives further messages but not code changes to what it covered, dependency / toolchain / environment / version changes, or a change to the claim itself. Once any of those happen, re-run the affected checks - and re-running a check whose inputs have not changed is not a ritual that earns extra credit, so cite the run you have.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. SCOPE: What exactly am I claiming - this function? this file? the suite? local? production?
2. IDENTIFY: What evidence covers that exact scope?
   - Code, dependency, environment, or version changed since? → the old run is spent; run the affected checks fresh
   - Nothing changed and the scope is the same? → cite the existing run; don't re-run it for show
3. RUN: Otherwise execute the full command, fresh and complete
4. READ: Full output, check exit code, count failures
5. VERIFY: Does output confirm the claim, as scoped?
   - If NO: State actual status with evidence
   - If YES: State the claim WITH its evidence and its scope
6. ONLY THEN: Make the claim
7. UNVERIFIED: List anything you did not verify or could not verify
```

If you cannot run the check, the honest output is "unverified, and here is why" - not a softer success claim.

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures, for the tests you name | "Should pass", or a run invalidated by later changes |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags - STOP

- Using "should", "probably", "seems to" in place of evidence
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without a check that covers the change
- Trusting agent success reports
- Relying on partial verification
- Calling something fixed because it passes on your machine
- Tired and wanting work over
- **Any wording implying success without evidence that covers that claim**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | Run the check, or say it is unverified |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial covers part - name the part it doesn't |
| "It passes locally" | Local ≠ production. Say which one you checked |
| "Different words so rule doesn't apply" | Scope and evidence still have to match |

## Key Patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
✅ [Ran earlier, no code changed since] "Tests pass - 34/34, run at <point>"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion (as scoped)
❌ "Tests pass, phase complete"
```

**Agent delegation:**
```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Reporting What You Did Not Verify

Not every unverified item can be closed before you report, and leaving it silent is what turns an honest partial result into a false claim. State what you could not verify and why, what would verify it (the command, the environment, who has access), and what your result therefore does and does not support - at every level, in a line.

## When To Apply

Before any variation of success/completion claims, any expression of satisfaction about the work's state, committing, PR creation, task completion, moving to the next task, or delegating to agents. The rule applies to exact phrases, paraphrases and synonyms, implications of success, and any other wording that suggests completion.
