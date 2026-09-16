---
name: systematic-debugging
description: Use when something behaves unexpectedly and the cause is not yet established - a bug, test failure, crash, or performance problem. Choose the investigation depth from the evidence you have. Not for explanations, lookups, or read-only analysis.
---

# Systematic Debugging

## Flow fit

- **Levels:** B, C, and D. Not A - explaining, looking something up, or reading code to answer a question is not debugging.
- **Lightweight path:** when the cause is already evidenced, skip the phase ceremony and run reproduce → evidence → smallest fix → targeted verification.
- **Skip when:** nothing is behaving unexpectedly, or you are doing a bounded read-only investigation to classify a task rather than to fix it.
- **Non-negotiables:** no fix without located evidence or a testable hypothesis; two failed fixes means stop and re-investigate instead of stacking a third patch.
- **Don't skip it because:** the issue looks simple (simple bugs have causes too), you are in a hurry (rushing guarantees rework), or someone wants it fixed NOW (systematic is faster than thrashing). Urgency changes what you are willing to call evidence - it never changes whether the cause is known.
- **When the cause is already evidenced** — you can point at the line, the log, or the failing test — the lightweight path is `reproduce → evidence → smallest fix → targeted verification`; the four phases below are the full process for an unknown cause, several components, or a fix that already failed. Say which one you are on in one line, and let new evidence move you between them.

## Overview

**Core principle:** find the cause before attempting fixes - a symptom fix is not a fix.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

"Investigation" scales with the evidence you have: a located cause satisfies it, a guess does not.

## When to Use

Use whenever the actual behavior differs from the expected behavior and the cause is not yet established: test failures, bugs in production, unexpected behavior, performance problems, build failures, integration issues.

**Take the full process when** fixes have already failed, you don't fully understand the issue, the failure crosses component boundaries, or time pressure and "just one quick fix" are pushing you to guess. **Stay on the lightweight path when** you can name the cause, point at your evidence, and the change is contained and reversible.

## The Four Phases (full process)

This is the path for an unknown cause. Each phase earns the next one: don't propose fixes before Phase 1 has produced evidence, and don't move on by assertion.

### Phase 1: Investigation

**Before proposing a fix, you need evidence for what is actually wrong.** Steps 1 and 2 are what the lightweight path keeps; the rest is for when the cause is still unclear.

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

5. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   See `root-cause-tracing.md` in this directory for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing pattern, read reference implementation COMPLETELY
   - Don't skim - read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Write it down
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Don't fix multiple things at once

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Ask for help
   - Research more

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Get a Failing Test Case**
   - If a failing test already covers this **and you have a recorded failure for the current code state**, reuse it - don't rewrite it and don't re-run it for show
   - If only a test file exists and you have not seen it fail, run it first and confirm it fails for the defect you are chasing before you touch the code
   - Otherwise: simplest possible reproduction, automated test if possible, one-off test script if no framework
   - For behavior defects this is what proves the fix; use the `superpowers:test-driven-development` skill for writing proper failing tests
   - When the defect genuinely has nothing to assert (copy, styling, generated output, or it truly cannot be automated here), use the honest alternative and say what it does not cover. The file type is not the reason - configuration and generated files can carry permission, routing, money, and contract behavior, and that behavior is testable

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Test passes now?
   - No other tests broken?
   - Issue actually resolved?
   - Use the `superpowers:verification-before-completion` skill before claiming success

4. **If Fix Doesn't Work**
   - STOP - do not stack another patch on top
   - Count: how many fixes have you tried?
   - First fix failed: return to Phase 1 and re-analyze with the new information
   - **Two or more fixes failed: this is an escalation trigger.** Stop patching, re-investigate from the evidence, and re-classify the task - the cause is not what you assumed, and the scope may be larger than you thought. A failure count is a trigger to investigate; on its own it is not evidence about the design, it does not authorize a refactor, and it does not require your human partner's approval for the next evidence-based step
   - Keep going with the investigation rather than asking permission to continue: an unreproduced cause is an investigation problem, not an authorization problem

5. **When the Evidence Points at the Design**

   A failure count alone proves nothing about the architecture - the real cause can still be a wrong assumption, the environment, or a test that never reproduced the defect. Reaching this step takes **specific evidence**, not a number:

   - Each fix reveals new shared state, coupling, or the same problem in a different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere, or two parts of the system disagree about who owns a piece of state

   **With that evidence in hand:** stop and put the pattern itself in question with your human partner - is this design fundamentally sound, are we sticking with it through inertia, should we fix the structure instead of the symptoms? Bring the evidence, not the failure count.

   **Without it:** you are still in Phase 1. Gather more evidence.

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the reproduction, I'll verify by hand" (manual verification is legitimate - skipping the *reproduction* is what leaves you guessing)
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 2+ fixes failed:** stop and re-investigate from the evidence; re-estimate the level before you touch the code again. Count is a trigger, not a verdict.
**Only with concrete coupling/interface/state evidence:** put the design itself in question (Phase 4, step 5).

## your human partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- "Ultra-think this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Size alone proves nothing - but an evidenced, contained cause really does need less process. Point at the cause or investigate. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 2+ failures is the trigger to stop and re-investigate. Nothing about the count says the architecture is wrong - only concrete coupling, interface, or state evidence does. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Investigation** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Reuse or write the failing test, fix, verify | Bug resolved, tests pass |

The lightweight path covers Phase 1 and Phase 4 for a cause you can already evidence. Phases 2 and 3 are how you get there when you can't.

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Supporting Techniques

Optional deep dives - load the one that fits the problem you actually have, not all three:

- **`root-cause-tracing.md`** - Trace bugs backward through call stack to find original trigger. Reach for it when the failure surfaces deep in the stack, far from where the bad value originated.
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause. Reach for it when the same bad data can re-enter through another path.
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling. Reach for it when a test is flaky or timing-dependent.

On the lightweight path you will usually not need any of them. Nothing here is a required step of a debugging pass.
