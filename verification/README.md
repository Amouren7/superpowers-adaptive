# verification/ — how this fork was checked

The checks behind the table in the root [README](../README.md). Everything here runs locally; nothing contacts a service except the behaviour scenarios, which call a model.

## Scripts

| Script | What it does | Needs |
|---|---|---|
| `static-checks.mjs <pkgDir>` | frontmatter, stale mandatory phrasing, cross-references, `## Flow fit` blocks, entry/manifest consistency, syntax, Graphviz block structure (no rendering) | Node only |
| `install-drill.mjs [archive.zip]` | install/restore rehearsal in `sandbox-install/`: locate the real plugin root, pre-check source, back up **and verify** the backup, stage, replace, post-check the hook; project-level install with a manifest of added/overwritten files and manifest-driven restore; plus a regression guard that the old wrong source path is rejected | Node + PowerShell |
| `setup-scenarios-v2.mjs` / `setup-scenarios-v3.mjs` | freeze the behaviour scenarios and criteria (prompt, seed fixture, per-criterion weight) and write `FREEZE.json` with per-file sha256 | Node |
| `run-scenario-v2.mjs <arm> all` | run the scenarios in isolated `dsh --profile headless` sessions (own `DSH_HOME`, empty `DSH_AGENTS_HOME`, skills copied into the scenario's own `.dsh/skills`) | DSH + model credentials + Git Bash |
| `check-scenarios-v2.mjs <arm>` | evaluate each criterion offline (filesystem deltas, message assertions, `cmd_pass`, and `test_log` — evidence a test actually ran) and verify the freeze manifest | Node |
| `injection-size.mjs` | measure what the session-start hook injects, by really executing it | Node + Git Bash |
| `retally-tokens.mjs` | recompute the token breakdown from raw metrics (uncached input / cache read / cache write / output kept separate — they have different prices and are never summed) | Node |
| `check-scenarios.mjs`, `make-compare.mjs` | the adaptive.1-era equivalents, with the corrected token reporting | Node |

## Layout

```
scenarios-v2/   T01–T09: nine acceptance scenarios, frozen before the adaptive.2 edits
scenarios-v3/   corrected criteria/fixtures for T03 and T07 (see below)
```

Generated output (`runs-*`, `results-*`, `home-*`, `pkgs/`, `sandbox-install/`) is git-ignored.

## Arms used in the report

| Arm | Package under test |
|---|---|
| `a1` | `6.3.0-adaptive.1` |
| `a2` | `6.3.0-adaptive.2` |
| `a3` | `6.3.0-adaptive.2` + the `executing-plans` consent clarification |

`pkgs/<arm>/skills` and `pkgs/<arm>/hooks` are what the runner copies; they are byte-compared with the package being delivered before any result is quoted.

## Two criteria defects found by running them (kept, not hidden)

- **T03 `no_branch_finish`** used "the assistant mentioned the skill name" as a proxy. An arm that explicitly said the skill was *not applicable* was scored FAIL. `scenarios-v3` replaces the proxy with the real state (branch/worktree) plus whether a commit/merge/PR was actually requested.
- **T07 `ran_tests`** needed a test-run trace, but T07's fixture test file did not carry the trace helper, so the criterion was unsatisfiable for both arms. `scenarios-v3` instruments the fixture.

Both are recorded in `scenarios-v3/FREEZE.json` under `defects_fixed`. The v2 definitions and their results were not rewritten.
