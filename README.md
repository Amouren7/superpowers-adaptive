> **Not an official Superpowers release.** This is an unofficial fork. Upstream: [obra/superpowers](https://github.com/obra/superpowers) — see [Provenance](#provenance) below and `NOTICE.md`.

# Superpowers Adaptive

**Skills as on-demand tools, not a gate you pass before replying.**

A fork of [Superpowers](https://github.com/obra/superpowers) that keeps the methodology and the guardrails, and replaces the entry rule — *"invoke a skill before any response (the 1% rule)"* — with a short process decision made per task: **A** direct · **B** lightweight fix · **C** standard development · **D** full process.

[English](#superpowers-adaptive) · [中文说明](#中文说明)

---

## Why this fork exists

Superpowers' skills are excellent; the entry rule was expensive in practice. A one-line typo fix and a payments change were routed into the same machinery — brainstorm → design doc → written plan → subagent dispatch → review → branch finishing — and the agent kept stopping to ask for permission it already had.

This fork keeps the parts that make the work good and changes **when they are required**:

| Level | Use for | Process | Not required |
|---|---|---|---|
| **A — Direct** | explanations, lookups, read-only analysis, plain copy edits | answer, or do the small thing | development workflow, process narration |
| **B — Lightweight fix** | known behavior, contained scope, evidenced cause, reversible | expected vs actual → locate the cause → smallest change → targeted verification → report | design/plan documents, worktree, review subagents, a second "go ahead" for a fix you already asked for |
| **C — Standard** | ordinary features, several touch points, a few design trade-offs | state the approach and the steps that matter, then design/TDD/review skills as needed | questions the request and the code already answer; re-deriving an existing design or plan |
| **D — Full** | new subsystems, architecture shifts, important interfaces or data models | full design, the confirmations that matter, a written plan, tests, review | re-confirming every step; confirm only what is undecided or unauthorized |

On top of the levels:

- **Risk sets the floor.** Authentication/authorization, payments and money thresholds, database schema and migrations, public API contracts, production/deploy config, security boundaries and other people's data are **at least C, usually D** — a one-line change in that list is still D. Size is not the criterion: a large mechanical change touching none of it can still be B.
- **Project context comes first.** The project's own `CLAUDE.md` / `AGENTS.md` / `README` / `HANDOFF` / `docs/` and its phase (prototype, active development, maintenance, legacy) set the default before the level table does.
- **Evidence floor by level.** A: nothing to run · B: a targeted check of the changed behavior, cited as run · C: the behavior test plus the tests around it · D: the area's full suite, the diff reviewed, and the risk controls the design named.
- **No ceremony.** Don't produce a plan, design doc, confirmation, todo list, or subagent dispatch the level does not need. Tool availability (subagents, worktrees) is not need.
- **Failure counts are triggers, not verdicts.** Repeated failed fixes mean *stop stacking patches and re-investigate*; they are never by themselves evidence that the architecture is wrong.
- **A file type is never a reason to skip verification.** Configuration and generated files carry permission, routing, money, and contract behavior all the time.

## What does *not* change

- The methodology skills themselves: brainstorming, writing-plans, executing-plans, subagent-driven-development, TDD, systematic-debugging, requesting/receiving-code-review, using-git-worktrees, finishing-a-development-branch, writing-skills.
- The six invariants: no blind fixes; verification matches the change; legitimate alternatives for work with nothing to assert; claims match evidence; no green-washing; authorization still applies.
- Upstream's voice and its behavior-shaping apparatus (Red Flags tables, rationalization lists, "your human partner") are preserved. Upstream's README ships verbatim as [`README.upstream.md`](README.upstream.md).

## Provenance

| | |
|---|---|
| Upstream | [`obra/superpowers`](https://github.com/obra/superpowers) |
| Base version | **v6.3.0**, commit `b36e082` |
| License | MIT — upstream `LICENSE` retained verbatim (© 2025 Jesse Vincent) |
| Fork version string | `6.3.0-adaptive.2` (declared in 9 manifests: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin`, `.cursor-plugin`, `.devin-plugin`, `.kimi-plugin`, `.hermes-plugin/plugin.yaml`, `gemini-extension.json`) |
| Plugin id | stays `superpowers` (harness compatibility); the distribution name is **Superpowers Adaptive** |
| Authorship | The A/B/C/D rewrite and everything listed below were produced with an AI coding agent (DeepSeek Harness, `deepseek-flash`) working from a human-authored review; upstream authorship and attribution are untouched. |

Two change rounds:

1. **`6.3.0-adaptive.1`** — entry rewritten to task levels; every skill got a `## Flow fit` block; hooks and harness integrations inject the new entry.
2. **`6.3.0-adaptive.2`** — resolved the conflicts the first round left behind (the entry said "on demand" while sub-skills still mandated the heavy flow), added the risk floor / evidence floor / anti-ceremony rules, and fixed the eval's token accounting. Details: [`docs/adaptive/change-note.md`](docs/adaptive/change-note.md).

## Verification

Verified, with the caveats stated as plainly as the results:

| Check | Result |
|---|---|
| Static consistency (`verification/static-checks.mjs`) | Package: **126/151**. This repository (with `verification/` and `docs/adaptive/` added): **147/172**. The 24 broken links are **identical in both** and pre-existing (historical plan files, upstream Anthropic sample links) — the only label change is the aggregate "all relative links resolve" line, which counts 38 links in the package and 54 in the repo, all 16 new ones resolving |
| Upstream repo test suites | **11/13 PASS** (hooks 6/6, pi 6/6, hermes 19, opencode caching, worktree path policy, shell lint, codex/kimi/devin/antigravity manifests, find-polluter). The 2 codex suites **fail identically on a pristine v6.3.0 checkout** — environment issue, not introduced here |
| Install / restore sandbox drill | **14/14 PASS** — target-absent install, backup→verify→stage→replace, restore byte-identical, and a project directory that already had a user's own custom skill (survives; restore is manifest-driven, never "delete the whole directory"). Includes a regression guard asserting that the old wrong source path **is rejected** |
| Behaviour scenarios | 9 scenarios × 3 arms, run through isolated `dsh --profile headless` sessions with the real session-start hook. Details and failures: [`docs/adaptive/verification-report.md`](docs/adaptive/verification-report.md) |
| DSH integration (`.dsh-plugin/`) | **Verified end to end**: a fresh `dsh --profile headless` session quoted a sentence from the entry verbatim, so the entry is present from turn 1. The hook route was tried first and rejected on evidence — DSH's Claude Code hook bridge ran the command but the context never reached the model (`SessionStart` is detached by design, and `UserPromptSubmit` failed the same probe). §6.8 of the report |
| Evidence | `docs/adaptive/evidence/` (raw check outputs, drill report, per-file hashes); the full run archive is a local artifact, not published |

**Not verified — read this before trusting it:** Graphviz rendering (no `dot` on the authoring machine), harness installer scripts, and the two codex test suites that also fail on a pristine checkout. Behaviour was exercised on synthetic repositories, mostly once per scenario — one observed stall did not reproduce on a second run, which is exactly why single runs are not treated as conclusions here.

**Claude Code, end to end (added after the first release, CLI 2.1.272):** the session-start hook really does inject the entry (confirmed from a `--debug-file` hook log), and the three levels behaved as designed — a level C request ("Let's make a react todo list") was scaffolded in one turn with no design interview and no second go-ahead; a level A request answered directly with zero file changes; a level B fix landed on the default branch with no plan document and no branch ceremony. In the two non-interactive sessions Claude Code's permission layer blocked `node`/`npm`, and in both cases the agent said the work was **unverified** rather than claiming a pass — the fix was then confirmed by an independent run (`pass 2 / fail 0`). Details: [`docs/adaptive/evidence/claude-code-e2e.md`](docs/adaptive/evidence/claude-code-e2e.md). Still unverified: interactive and multi-turn sessions, other models, other harnesses.

**Cost, stated honestly:** the session-start entry grew from 5,760 to 6,986 characters (+21%). It hit a hard limit on the way — Hermes spills injected context over 10,000 characters, and the first draft was 10,414 and failed its own test; it is 9,831 now. Skill bodies grew 2.2%.

## Try it

**Claude Code, without touching your installed version:**

```bash
git clone https://github.com/Amouren7/superpowers-adaptive
claude --plugin-dir "/path/to/superpowers-adaptive"
```

The fork's work lives on the **`adaptive-flow`** branch (branched from upstream `v6.3.0`); it is the default branch here, so a plain clone checks it out. The fork's `main` tracks upstream and is left alone.

**Any harness with a project-level skills directory** (Claude Code, DSH, …): copy this repo's `skills/` into the project, recording what you added or overwrote so you can roll back — the safe procedure (pre-checks, backup, manifest-driven restore) is in [`docs/adaptive/install-restore.md`](docs/adaptive/install-restore.md).

**Other harnesses** (Codex, Cursor, Gemini, Copilot, Kimi, OpenCode, Pi, Hermes, Antigravity, Devin, Factory Droid, Grok): the same integration points as upstream, described in [`README.upstream.md`](README.upstream.md) — substitute this repository's URL for `obra/superpowers`.

**DeepSeek Harness:** [`.dsh-plugin/`](.dsh-plugin/README.md) injects the entry into every DSH session as a durable prompt context, so sessions start already knowing about the A/B/C/D levels. Install it into a profile's `bundles` (the plugin folder has the exact steps, including the `dsh.bundle.patch` requirement that makes a profile fail to boot if omitted).

**Running a release archive:** a package is this repository tree inside a top-level `superpowers-6.3.0-adaptive.2/` folder. The install drill exists because that extra directory level is easy to get wrong: `node verification/install-drill.mjs <archive.zip>`.

## Repository layout

```
skills/                 14 skills (upstream's, with the adaptive entry + `## Flow fit` blocks)
hooks/                  session-start bootstrap (injects the entry; unchanged mechanics)
.dsh-plugin/            DeepSeek Harness integration — injects the entry as a prompt context
.opencode/ .pi/ .hermes-plugin/ .claude-plugin/ .codex-plugin/ …   harness integrations
docs/adaptive/          provenance, change note, verification report, install/restore
docs/adaptive/evidence/ raw check outputs behind the table above
verification/           eval harness: scenarios, criteria, runner, checker, install drill
tests/                  upstream's plugin-infrastructure tests
```

## Reproducing the checks

```bash
node verification/static-checks.mjs .                       # static consistency
node verification/install-drill.mjs <archive.zip>           # install/restore drill (sandboxed)
node verification/setup-scenarios-v2.mjs                    # freeze the scenarios
node verification/run-scenario-v2.mjs a3 all                # needs `dsh --profile headless` + credentials
node verification/check-scenarios-v2.mjs a3                 # evaluate the criteria offline
```

The runner isolates itself: its own `DSH_HOME`, an empty `DSH_AGENTS_HOME`, and skills installed into the scenario's own `.dsh/skills`. It never touches an installed plugin.

## Contributing

This is a personal fork, so it does not follow upstream's contribution rules — issues and PRs about the adaptive flow itself are welcome here.

**Do not send fork-specific changes upstream.** [Upstream's own guidelines](CLAUDE.md) close fork-sync PRs, and skill-behaviour changes need their own eval evidence. If something here is a genuine upstream defect (for example a skill that contradicts itself), fix it as its own minimal PR against upstream's `dev` branch, complete their PR template, disclose the model and harness that produced it, and show the diff to a human before submitting.

## Credits and license

All the hard parts are upstream's: [Jesse Vincent](https://blog.fsck.com) and the team at [Prime Radiant](https://primeradiant.com) designed and tuned this system, its skills, and its voice. This fork only changes the routing decision.

MIT — see [`LICENSE`](LICENSE). Not affiliated with or endorsed by Prime Radiant or the Superpowers maintainers.

---
---

# 中文说明

> **非官方版本。** 这是 [obra/superpowers](https://github.com/obra/superpowers) 的非官方 fork，与上游维护者无隶属关系。来历见下方「来历」，版权声明见 `NOTICE.md`。

**把技能当按需加载的工具，而不是回话前必须通过的关卡。**

本 fork 保留 Superpowers 的方法论与质量底线，把入口规则——「任何回应前都必须先调用技能（1% 规则）」——换成**按任务分级的一次判断**：**A** 直接办 · **B** 轻量修复 · **C** 标准开发 · **D** 完整流程。

## 为什么要改

Superpowers 的技能质量很高，问题出在入口规则：改一个错别字和改一条资金阈值，会走同一套机器——brainstorm → 设计文档 → 书面计划 → 子代理派发 → 评审 → 分支收尾；而且已经授权的修复，它还会再停下来问一次。

本 fork 保留让工作变好的部分，只改**什么时候必须用**：

| 等级 | 适用 | 流程 | 不要求 |
|---|---|---|---|
| **A — 直接** | 解释、查资料、只读分析、纯文案修改 | 回答，或直接把小事做掉 | 开发流程、流程旁白 |
| **B — 轻量修复** | 行为已知、范围可控、原因有据、可回滚 | 确认预期与实际 → 定位原因 → 最小改动 → 针对性验证 → 汇报 | 设计/计划文档、worktree、评审子代理；已授权的修复不再等第二次点头 |
| **C — 标准** | 普通功能、多处触点、少量设计取舍 | 说清方案与关键步骤，再按需加载设计/TDD/评审技能 | 请求与代码已经回答的问题；重复推导已有的设计或计划 |
| **D — 完整** | 新子系统、架构调整、重要接口或数据模型 | 完整设计、必要的确认、书面计划、测试、评审 | 逐步重复确认；只确认仍未决定或未授权的部分 |

等级之上还有几条：

- **风险决定下限。** 认证授权、支付与金额阈值、数据库 schema 与迁移、公共 API 契约、生产配置与发布链路、安全边界与他人数据——**至少 C，通常是 D**，一行改动也不例外。代码量不是标准：一次不碰这些的大规模机械改动，照样可以只是 B。
- **项目约束优先。** 项目自己的 `CLAUDE.md` / `AGENTS.md` / `README` / `HANDOFF` / `docs/` 与所处阶段（原型 / 开发 / 维护 / 遗留）先于分级表生效。
- **分级验证下限。** A：无需运行 · B：对改动行为做针对性检查并注明运行方式 · C：变更的行为测试 + 周边测试 · D：该区域全量测试 + 复核 diff + 设计里点名的风险控制。
- **反仪式。** 不产出该等级不需要的计划、设计文档、确认、待办或子代理派发；有子代理/有 worktree 不等于该用它们。
- **失败次数只是触发器，不是结论。** 连续修复失败意味着"停止叠加补丁、重新调查"，它本身**从来不是**架构有问题的证据。
- **文件类型从来不是跳过行为验证的理由。** 配置与生成文件常常承载权限、路由、金额与契约行为。

## 没有改动的部分

- 方法论技能本身：brainstorming、writing-plans、executing-plans、subagent-driven-development、TDD、systematic-debugging、requesting/receiving-code-review、using-git-worktrees、finishing-a-development-branch、writing-skills。
- 六条不变量：不做盲改；验证匹配改动；无可断言行为时用诚实的替代验证；结论不超出证据；不美化通过；授权边界仍然有效。
- 上游的语感与行为塑造装置（Red Flags 表、合理化对照表、"your human partner"）原样保留。上游 README 原文见 [`README.upstream.md`](README.upstream.md)。

## 来历

| | |
|---|---|
| 上游 | [`obra/superpowers`](https://github.com/obra/superpowers) |
| 基线版本 | **v6.3.0**，commit `b36e082` |
| 许可 | MIT，上游 `LICENSE` 原样保留（© 2025 Jesse Vincent） |
| 本 fork 版本号 | `6.3.0-adaptive.2`（9 处清单一致：`package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`、`.codex-plugin`、`.cursor-plugin`、`.devin-plugin`、`.kimi-plugin`、`.hermes-plugin/plugin.yaml`、`gemini-extension.json`） |
| 插件 id | 仍为 `superpowers`（保证各 harness 兼容）；分发名为 **Superpowers Adaptive** |
| 作者说明 | A/B/C/D 改造及下列内容由 AI 编码代理（DeepSeek Harness、`deepseek-flash`）依据人工评审报告完成；上游署名与归属未改动。 |

两轮改动：

1. **`6.3.0-adaptive.1`** —— 入口改为任务分级；每个技能补 `## Flow fit`；钩子与各 harness 集成改为注入新入口。
2. **`6.3.0-adaptive.2`** —— 消解第一轮遗留的冲突（入口说"按需"、子技能却仍强制重流程），补上风险下限/验证下限/反仪式条款，修正评测的 token 口径。详见 [`docs/adaptive/change-note.md`](docs/adaptive/change-note.md)。

## 验证情况

已经验证的、以及验证不到的，一并列出：

| 检查 | 结果 |
|---|---|
| 静态一致性（`verification/static-checks.mjs`） | 候选包：**126/151**。本仓库（加了 `verification/` 与 `docs/adaptive/`）：**147/172**。24 个断链两边**完全相同**且是预存的（历史计划文件、上游 Anthropic 示例链接）——唯一变化的是「所有相对链接可解析」这条汇总项：候选包里 38 个相对链接，本仓库 54 个，新增的 16 个全部可解析 |
| 上游自带测试套件 | **11/13 通过**（hooks 6/6、pi 6/6、hermes 19、opencode 缓存、worktree 路径策略、shell lint、codex/kimi/devin/antigravity 清单、find-polluter）。2 条 codex 套件在**纯净 v6.3.0 检出上同样失败**——环境问题，非本次引入 |
| 安装/恢复沙箱演练 | **14/14 通过**——目标不存在时安装、备份→校验→暂存→替换、按备份恢复后逐字节一致、项目目录里**已有用户自定义技能**时只按清单回滚（不会"删掉整个目录"）；另有一条反向断言：旧的错误源路径**会被预检查拦下** |
| 行为场景实测 | 9 个场景 × 3 个臂，在隔离的 `dsh --profile headless` 会话里跑，真实执行 session-start 钩子注入。细节与失败项见 [`docs/adaptive/verification-report.md`](docs/adaptive/verification-report.md) |
| DSH 集成（`.dsh-plugin/`） | **端到端已验证**：全新的 `dsh --profile headless` 会话能逐字引用入口里的句子，说明第一轮就在上下文中。先试过 hook 路线并按证据放弃——DSH 的 Claude Code hook 桥接会执行命令，但上下文送不到模型（`SessionStart` 按设计是脱离运行的，`UserPromptSubmit` 同样没通过探针）。见报告 §6.8 |
| 证据 | `docs/adaptive/evidence/`（各检查原始输出、演练报告、逐文件哈希）；完整运行归档是本地产物，未随仓库发布 |

**未验证的部分（信它之前请先看这段）**：Graphviz 渲染（作者机器无 `dot`）、各 harness 的安装脚本、以及在纯净检出上同样失败的那两条 codex 套件。行为实测在合成仓库上进行，多数场景只跑一次——观察到的一次停顿在第二次运行中没有复现，这正是本仓库不把单次结果当结论的原因。

**Claude Code 端到端（首发后补测，CLI 2.1.272）**：session-start 钩子确实注入了入口（由 `--debug-file` 的钩子日志证实）；三级行为符合设计——C 级请求（"Let's make a react todo list"）一轮内搭好应用，没有设计访谈、没有等第二次点头；A 级请求直接作答、源码零改动；B 级修复落在默认分支，没有计划文档、没有分支仪式。两个非交互会话里 `node`/`npm` 被 Claude Code 权限层拦住，两次都明确写了"**未验证**"而没有谎称通过——修复随后由独立复跑确认（`pass 2 / fail 0`）。详见 [`docs/adaptive/evidence/claude-code-e2e.md`](docs/adaptive/evidence/claude-code-e2e.md)。仍未覆盖：交互式与多轮会话、其它模型、其它 harness。

**代价如实说**：会话启动入口从 5,760 字符涨到 6,986 字符（+21%）。涨的过程中撞到过一条硬限制——Hermes 注入上下文超过 10,000 字符会被 spill 到文件，第一版 10,414 字符直接让自己的一条测试失败，压缩后 9,831。技能正文增长 2.2%。

## 怎么用

**Claude Code，不动已安装版本：**

```bash
git clone https://github.com/Amouren7/superpowers-adaptive
claude --plugin-dir "/path/to/superpowers-adaptive"
```

本 fork 的改动在 **`adaptive-flow`** 分支上（从上游 `v6.3.0` 分出），它同时是本仓库的默认分支，直接 clone 即得到它；仓库的 `main` 跟随上游、保持原样。

**任何支持项目级技能目录的 harness**（Claude Code、DSH 等）：把本仓库 `skills/` 放进项目里，并**记录本次新增/覆盖了哪些**以便回滚——安全步骤（预检查、备份、按清单恢复）见 [`docs/adaptive/install-restore.md`](docs/adaptive/install-restore.md)。

**其他 harness**（Codex、Cursor、Gemini、Copilot、Kimi、OpenCode、Pi、Hermes、Antigravity、Devin、Factory Droid、Grok）：集成点与上游一致，见 [`README.upstream.md`](README.upstream.md)，把其中的 `obra/superpowers` 换成本仓库地址即可。

**DeepSeek Harness**：[`.dsh-plugin/`](.dsh-plugin/README.md) 把入口作为持久 prompt context 注入每个 DSH 会话，会话一开始就知道 A/B/C/D 分级。按插件目录里的步骤把它加进某个 profile 的 `bundles` 即可（那里也写明了漏掉 `dsh.bundle.patch` 会让 profile 起不来的坑）。

**关于发布包**：打包后的归档 = 本仓库内容套一层 `superpowers-6.3.0-adaptive.2/` 顶层目录。正因为多这一层很容易搞错，才有了安装演练：`node verification/install-drill.mjs <archive.zip>`。

## 仓库结构

```
skills/                 14 个技能（上游技能 + 自适应入口与 `## Flow fit`）
hooks/                  session-start 启动注入（机制未改）
.dsh-plugin/            DeepSeek Harness 集成——把入口作为 prompt context 注入
.opencode/ .pi/ .hermes-plugin/ .claude-plugin/ .codex-plugin/ ……  各 harness 集成
docs/adaptive/          来历、变更说明、验证报告、安装与恢复
docs/adaptive/evidence/ 上表各项检查的原始输出
verification/           评测工具：场景、判据、运行器、校验器、安装演练
tests/                  上游的插件基础设施测试
```

## 复跑检查

```bash
node verification/static-checks.mjs .                       # 静态一致性
node verification/install-drill.mjs <archive.zip>           # 安装/恢复演练（沙箱内）
node verification/setup-scenarios-v2.mjs                    # 固化场景与判据
node verification/run-scenario-v2.mjs a3 all                # 需要 dsh --profile headless 与凭据
node verification/check-scenarios-v2.mjs a3                 # 离线校验判据
```

运行器自带隔离：独立 `DSH_HOME`、空 `DSH_AGENTS_HOME`、技能只装进场景自己的 `.dsh/skills`，**不会碰你已安装的插件**。

## 贡献

这是个人 fork，不适用上游的贡献规则；关于自适应流程本身的问题与 PR 欢迎提到本仓库。

**不要把这些改动提到上游。** [上游自己的指南](CLAUDE.md) 明确会关闭 fork 同步类 PR，技能行为改动也需要配套评测证据。如果你发现的是上游的真实缺陷（例如某个技能自相矛盾），请单独开一个最小 PR 到上游 `dev` 分支，填完他们的 PR 模板、披露产出所用的模型与 harness，并先把完整 diff 给人看过再提交。

## 致谢与许可

难的部分都是上游的：[Jesse Vincent](https://blog.fsck.com) 与 [Prime Radiant](https://primeradiant.com) 团队设计并打磨了这套系统、技能与语感。本 fork 只改了路由决策。

MIT，见 [`LICENSE`](LICENSE)。与 Prime Radiant 及 Superpowers 维护者无隶属或背书关系。
