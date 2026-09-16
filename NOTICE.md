# Notice

**Superpowers Adaptive** is an unofficial fork of [Superpowers](https://github.com/obra/superpowers).

- Upstream project: Superpowers — <https://github.com/obra/superpowers>
- Upstream copyright: © 2025 Jesse Vincent — MIT License (retained verbatim in [`LICENSE`](LICENSE))
- Upstream authors: Jesse Vincent and the team at [Prime Radiant](https://primeradiant.com)
- Base revision used by this fork: **v6.3.0** (`b36e082`)

This fork is **not affiliated with, endorsed by, or supported by** Prime Radiant, Jesse Vincent, or the Superpowers maintainers. Do not report problems with this fork to them. Their issue tracker, Discord, and commercial support channels are for upstream Superpowers.

## What this fork claims and does not claim

- It claims: the design/debugging/testing/verification skills and the high-risk guardrails are upstream's, unchanged in substance; what changed is *when* they are required — a per-task process level (A/B/C/D) instead of "invoke a skill before any response".
- It does not claim: that it is better than upstream in general, or that any efficiency or quality gain is measured. Verification is single-run, single-model, on synthetic repositories, and the verification report states exactly which parts are unverified (`docs/adaptive/verification-report.md`).
- Upstream's own files (skills, hooks, harness integrations, docs, `RELEASE-NOTES.md`, historical plans/specs) are kept as-is except where the process change required an edit; the modified file list is in `docs/adaptive/change-note.md`.

## Trademarks

"Superpowers" is used here only to identify the upstream project this fork derives from. The plugin id remains `superpowers` for harness compatibility.
