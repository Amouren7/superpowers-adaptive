---
name: receiving-code-review
description: Use when review feedback arrives and you are about to implement it - calibrates investigation depth to the comment's blast radius while keeping the rigor (verify first, push back with evidence, no performative agreement); not for feedback on trivial wording you can simply accept
---

# Code Review Reception

## Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. SIZE IT: How far does this comment reach? (see "Investigation Depth")
4. VERIFY: Check against codebase reality - to the depth step 3 warrants
5. EVALUATE: Technically sound for THIS codebase?
6. RESPOND: Technical acknowledgment or reasoned pushback
7. IMPLEMENT: One item at a time, test each
```

## Investigation Depth

| Comment reaches | Do |
|-----------------|-----|
| Wording, naming, formatting, a local style preference | Apply it and move on — no codebase survey. If it is genuinely wrong or the codebase convention differs, say so in one line |
| Behavior, an interface, a data shape, a shared helper | Verify against the codebase before implementing: what calls it, what breaks, what the current implementation was doing |
| Architecture, security, money, permissions, data loss, or a public contract | Full verification, and involve your human partner on anything that conflicts with prior decisions |

**Inherited context.** Feedback on work already in flight inherits the design, plan, and authorization behind it — handle the delta. Do not re-open settled decisions, re-derive the design, or restart the requirements interview because a comment arrived; re-design only when the comment changes the scope.

## Forbidden Responses

**NEVER:**
- "You're absolutely right!" (explicit instruction-file violation)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before you have sized the comment)

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

```
IF any item is unclear:
  ASK about the unclear items before implementing them

IF the unclear item blocks others:
  STOP - do not implement the rest yet
  WHY: Items may be related. Partial understanding = wrong implementation.

Otherwise implement the clear ones and say which item you are asking about.
```

**Example:**
```
your human partner: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Guess at 4,5 and hope, or silently skip them
✅ RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

## Source-Specific Handling

### From your human partner
- **Trusted** - implement after understanding
- **Still ask** if scope unclear
- **No performative agreement**
- **Skip to action** or technical acknowledgment

### From External Reviewers
```
BEFORE implementing, for anything above a local edit:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with your human partner's prior decisions:
  Stop and discuss with your human partner first
```

**your human partner's rule:** "External feedback - be skeptical, but check carefully"

## YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**your human partner's rule:** "You and reviewer both report to me. If we don't need this feature, don't add it."

## Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST (unless it is independent - see above)
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Verify each fix in proportion to what it touches
  4. Verify no regressions
```

Verification stays real at every depth — what scales down is ceremony, never evidence. Never delete a test, weaken an assertion, or swallow a failure to make a comment look addressed.

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with your human partner's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve your human partner if architectural

**If you're uncomfortable pushing back out loud:** Name that tension, then tell your partner about the issue you've seen. They'll appreciate your honesty.

## Acknowledging Correct Feedback

When feedback IS correct:
```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback.

**If you catch yourself about to write "Thanks":** DELETE IT. State the fix instead.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

State the correction factually and move on.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first — to the depth the comment warrants |
| Batch without testing | One at a time, verify each in proportion to its reach |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | State limitation, ask for direction |

## Real Examples

**Performative Agreement (Bad):**
```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**Technical Verification (Good):**
```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI (Good):**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

## GitHub Thread Replies

When replying to inline review comments on GitHub, reply in the comment thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), not as a top-level PR comment.

## Flow fit

- **Levels / Lightweight path / Skip when:** applies whenever feedback arrives — usually C/D work, and B when your human partner reviews a fix after the fact; one item with local reach means apply it, verify what it touches, and report; skip when the comment is pure wording you already agree with, or duplicates a decision made in this session.
- **Non-negotiables:** verify before implementing anything that reaches behavior, and never green-wash a finding — no deleted tests, weakened assertions, or swallowed failures.
