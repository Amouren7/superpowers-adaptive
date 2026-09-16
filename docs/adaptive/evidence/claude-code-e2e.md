# Claude Code end-to-end check (2026-09-16)

Environment: Claude Code CLI **2.1.272** on Windows, plugin installed at `~/.claude/plugins/superpowers` (this package) with the user-level skill copies in `~/.claude/skills` updated to match, model routed through the machine's configured relay. Three non-interactive sessions (`claude -p`, `--permission-mode acceptEdits`), each in its own throwaway git repo.

## Hook injection — confirmed

`claude -p "Reply with exactly: OK" --debug-file hook-debug.log` recorded:

```
[DEBUG] "Hook SessionStart:startup (SessionStart) success:
{ "hookSpecificOutput": { "hookEventName": "SessionStart", "additionalContext": ...
```

So the fork's bootstrap really is injected at session start through `hooks/run-hook.cmd session-start` — the path `settings.json` calls.

## Level C — `Let's make a react todo list`

Result: scaffolded a complete Vite + React todo app in one turn (9 files: `index.html`, `vite.config.js`, `package.json`, `src/main.jsx`, `src/useTodos.js`, `src/App.jsx`, `src/TodoItem.jsx`, `src/index.css`, `.gitignore`) — no design interview, no design document, no waiting for a second go-ahead. It stated the two decisions it made that a human might disagree with (empty title reverts instead of deleting; row actions kept in the DOM for keyboard users) and asked only for the permission it needed to run `npm install`.

It also reported honestly that it could not install or run anything, because Claude Code's permission layer blocked `node` and `npm` in a non-interactive session:

> Scaffolded a Vite + React todo app. **I could not install or run it** — every shell command I tried was blocked by the permission layer … So the code below is written but **unverified**.

That is the intended behaviour: work at level C proceeds, and the completion claim stays inside the evidence.

## Level A — explain `applyDiscount`, change nothing

Result: line-by-line explanation, the field mapping table for `ORDERS`, and the observation that the function returns a discounted price rather than a discount amount. `git status` after the run shows no source file touched. No process, no documents, no questions.

## Level B — `node --test` fails, fix it

Result: located the cause (`slugify` only collapsed whitespace, so punctuation survived), rewrote the replacement to `[^a-z0-9]+` plus a trim of leading/trailing dashes, hand-traced both cases, stayed on `master`, produced no plan document, created no branch, and did not ask for a second approval. It also flagged a real edge case beyond the failing test (non-ASCII input becomes empty, e.g. `Café` → `caf`).

Again the permission layer blocked `node`, and again it said so instead of claiming a pass:

> I've made the fix, but I could not actually run the tests — every `node` invocation … came back `requires approval` … So I have **not** verified this by execution. Being explicit about that rather than claiming a pass.

Independent re-run of the fix by the installer:

```
✔ basic (0.8311ms)
✔ punctuation is dropped (0.1165ms)
ℹ pass 2   ℹ fail 0
```

and `slugify('Hello, World!') === 'hello-world'`, `slugify('a  --  b') === 'a-b'`.

## What this does and does not establish

- Establishes: the entry bootstrap reaches a real Claude Code session; A/B/C levels behave as the design intends on three tasks; the verification invariant survives a permission-blocked environment (the agent refused to claim an unverified pass).
- Does not establish: interactive (non `-p`) behaviour, multi-turn sessions, other harnesses' installers, other models, or anything about long-term or production effect. Shell execution could not be exercised inside these sessions, so "runs the tests itself" was not observed end-to-end here — the fix was verified by an independent run outside the session.
- Environment notes, not properties of this package: this machine must set `HTTPS_PROXY=http://127.0.0.1:10808` for a non-interactive shell to reach the configured model relay (direct connection times out), and Claude Code logs `unrecognized_model` for the `deepseek-*` names mapped in `settings.json`.
