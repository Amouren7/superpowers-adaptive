# .dsh-plugin — Superpowers Adaptive for DeepSeek Harness

The DSH integration for this fork, in the same spirit as upstream's `.opencode/`, `.pi/` and `.hermes-plugin/` integrations: a small plugin that puts the adaptive entry (`using-superpowers`) in front of every DSH session.

## What it does

Registers one **durable prompt context** with DSH's `system-prompt` service. DSH materialises prompt contexts as a user-role snapshot in the conversation, so the entry is present **from the first turn** of every session — the DSH-native equivalent of the Claude Code `SessionStart` injection.

The entry text is **not** copied into this package: the plugin reads it at assembly time from the installed Superpowers plugin directory (`~/.claude/plugins/superpowers/skills/using-superpowers/SKILL.md` by default, override with `SUPERPOWERS_PLUGIN_ROOT`). Editing that file changes what the next assembly injects, and the two copies cannot drift.

If the entry file is missing, the plugin logs a warning and injects nothing — a session still starts normally.

**Subagents are skipped.** The entry opens with `<SUBAGENT-STOP>` and tells a dispatched subagent to ignore it, so contributing it there would only cost tokens (~2k per subagent). The plugin reads the live agent from the assembly context and returns nothing when `delegationDepth > 0`; anything unreadable means "not a subagent", so a shape change degrades to the old behaviour rather than to a missing entry. A subagent *forked from* a session whose history already carries the snapshot still sees it there — that is fork inheritance, not injection.

`../verification/check-dsh-plugin.mjs` exercises the shipped `lib/index.js` against a fake context: registration, root injection, the subagent skip, and that the injected text matches the installed skill (8/8 PASS).

## Why not a hook

DSH ships `@deepseek-ai/dsh-hooks-claude-code`, which runs Claude Code hook configs on DSH's interception seams, so this integration was first built as a `SessionStart` (and then `UserPromptSubmit`) hook config. Measured on this machine (DSH `0.1.5-rc.1`, bridge `0.1.5-rc.2`):

- the bridge **did** run the command (a marker file written by the hook proves it);
- but the hook's `hookSpecificOutput.additionalContext` **never reached the model** — a probe asking the model to quote an injected marker answered `NONE` on both events, and `SessionStart` is documented as running detached, so it can miss the first request anyway.

The prompt-context route has no shell, no subprocess and no race, and it was verified end to end (a fresh headless session quoted a sentence from the entry verbatim). Details and the raw probe results: [`../docs/adaptive/verification-report.md`](../docs/adaptive/verification-report.md) §6.8.

## Install

```powershell
# from the repository root, with the DSH profile you want (web is the default)
dsh plugin --profile web add "file:$PWD\.dsh-plugin"
```

or, if the plugin manager is not available, add it to the profile by hand — `%USERPROFILE%\.dsh\profiles\<profile>\package.json`:

```json
{
  "dependencies": { "@dsh-external/dsh-superpowers-adaptive": "file:D:/path/to/superpowers-adaptive/.dsh-plugin" },
  "dsh": { "profile": { "bundles": ["...", "@dsh-external/dsh-superpowers-adaptive"] } }
}
```

then link it into the profile's `node_modules` (a junction on Windows) and restart DSH. The bundle must declare `dsh.bundle.patch` — it does (`cordis.patch.yml`), and a package added to `bundles` without that field makes the profile fail to boot.

Two pitfalls that cost real time when installing this by hand:

- **The profile's `package.json` must stay BOM-free.** DSH parses it with `JSON.parse`, which rejects a leading BOM: `SyntaxError: Unexpected token '', "{ "name"... is not valid JSON`. PowerShell's `Set-Content -Encoding UTF8` writes a BOM — use `Set-Content -Encoding utf8NoBOM` (PowerShell 7+), `[IO.File]::WriteAllText(...)`, or Node's `fs.writeFileSync(path, text, 'utf8')`.
- `dsh plugin --profile <p> add "file:..."` runs pnpm, which mangles a path containing spaces (`Could not install from "D:/Deepseek"`). Hand-edit the manifest or install from a space-free path.

No build step is required: `lib/index.js` is plain ESM with no runtime dependencies (`scripts/build.sh` only checks syntax and copies `src/` → `lib/`).

## Remove

Drop the package from the profile's `bundles` and `dependencies`, delete its `node_modules` junction, and restart DSH. Nothing else is touched.
