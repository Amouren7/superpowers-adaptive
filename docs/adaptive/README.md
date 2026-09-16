# docs/adaptive — provenance, changes, and verification

Everything about *this fork* as opposed to upstream Superpowers. Start with the root [README](../../README.md) for what the fork is; these files are the record behind it.

| File | What it is |
|---|---|
| [`change-note.md`](change-note.md) | What changed in `6.3.0-adaptive.1` → `6.3.0-adaptive.2`, file by file: the seven review findings and how each was resolved, the cross-reference audit, which suggestions were adopted and which were rejected (with reasons), and the measured cost |
| [`verification-report.md`](verification-report.md) | The verification record: disposition table for the review, delivered-vs-verified identity, static checks, upstream test suites (including the two that fail on a pristine checkout too), the install/restore rehearsal, the behaviour scenarios across three arms, the two criteria defects found by running them, and an explicit list of what is **not** verified |
| [`install-restore.md`](install-restore.md) | How to try it, how to replace an installed copy, and how to roll back — built around the one mistake that is easy to make (an archive with a top-level directory) and around *not* deleting a project's existing `.dsh/skills` |
| [`evidence/`](evidence/) | Raw outputs behind the claims: static-check runs (v6.3.0 / adaptive.1 / adaptive.2), the upstream test-suite log, the install-drill report, the two codex suites on a pristine baseline, and per-file hashes proving the delivered tree is the tree that was tested |

## Scope and honesty rules used here

- Claims are limited to what was run. Where something was not run (Claude Code end-to-end, Graphviz rendering, harness installers) it is listed as unverified rather than implied.
- Token counts are never summed into a single "total": uncached input, cache reads, and output have different prices, and no cost figure is given because there is no billing basis.
- No efficiency claim is made. Scenarios ran once each, on one model, on synthetic repositories; one observed stall did not reproduce on a rerun, which is why single runs are treated as observations, not conclusions.
- Where a criterion turned out to be badly written (a proxy that mis-scores a correct answer, or a fixture that cannot satisfy the criterion), it is reported as a defect of the *test* and re-run under a corrected, versioned set — the original definition and its results are kept.

## Timeline

| Commit | What |
|---|---|
| `f01828a` | `6.3.0-adaptive.1` — entry rewritten to A/B/C/D levels; `## Flow fit` blocks; hooks and harness integrations inject the new entry |
| `803d75f` | `6.3.0-adaptive.2` — the seven review findings, the cross-reference audit, risk floor / evidence floor / anti-ceremony, token-accounting fix |
| `77270e9` | `executing-plans` consent clarification (the main/master line read as "always ask first") |
