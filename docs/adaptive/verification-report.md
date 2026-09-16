> Repo edition: paths below are adjusted to this repository (tooling in `verification/`, check evidence in `docs/adaptive/evidence/`). The original delivery copies stay in the maintainer's local `dist/`, which is not published.

> 仓库版：下列路径已按本仓库结构调整（评测工具在 `verification/`，检查证据在 `docs/adaptive/evidence/`）；原始交付版保留在维护者本地 `dist/` 中，未随仓库发布。


# 验证报告 — superpowers **6.3.0-adaptive.2**

审查对象：`发布归档（= 本仓库内容套一层 superpowers-6.3.0-adaptive.2/ 顶层目录）`
对照：adaptive.1（`801eb14`）、上游 v6.3.0（`b36e082`）、本轮最终提交 `843fe51`（含 `13940c3`）
环境：Windows + PowerShell 5.1 + Node v24.18.1 + Git Bash；DSH `--profile headless` 隔离运行（独立 `DSH_HOME`、空 `DSH_AGENTS_HOME`、cwd 内 `.dsh/skills`）
证据包：`本地证据归档（未随仓库发布）`（原始结果、判据、脚本、场景、冻结清单、安装演练报告、逐文件哈希）

**结论先写**：审查报告提出的 7 项**全部成立、全部已修**；七项之外另做了一轮交叉引用审计并修掉 6 处会绕回强制流程的入口。行为实测用两套判据跑了 3 个臂共 24 次；其中 **2 条判据被证明是我自己写坏的（不是被测行为差异）**，已在第 6 节如实列出并用修正后的 v3 判据重跑。没有任何「提效 N%」或「全程未退化」的结论被写进本报告。

---

## 1. 审查七项处理表

| # | 审查意见 | 处置 | 可复查证据 |
|---|---|---|---|
| 1 | 安装命令复制错误层级，并在校验前删除旧版本；项目级恢复假定目录不存在、靠删整个目录 | **已修复** | `install-restore.md` 重写（真插件根 + 三项预检查 + 备份校验 + 暂存后替换 + 清单式恢复）；`verification/install-drill.mjs` 14/14 PASS，其中 `old-src-is-rejected` 专门断言**旧的错误 `$src=unpacked` 会被预检查拦下**；`caseC-restore-byte-identical`、`caseC-no-whole-dir-delete` 断言已有自定义技能不被删 |
| 2 | brainstorming 对 C 级的批准要求自相矛盾（Bounded 无条件 STOP、Spike 要 nod、存疑取重） | **已修复** | 正文 Bounded 路径、Spike 路径、"存疑"段、Checklist、dot 流程图、Flow fit、HARD-GATE、Non-negotiables 全部同步改写（不是只加顶部豁免）。静态检查 `flow-fit 29/29`、`entry-consistency 12/12` 通过；行为面 T01（已授权小功能不再二次请示）a1/a2 must 4/4，T02（只读调研不先等点头）3/3 |
| 3 | executing-plans 按「工具是否存在」强制进入子代理/工作区/分支收尾 | **已修复** | 删除"有子代理就必须用 subagent-driven-development"；worktree 改为「确实需要隔离时」；收尾改为「本次真的做了分支生命周期工作或被要求时」。另修 4 处交叉入口（`writing-plans` 计划头模板、`subagent-driven-development` 收尾行、antigravity 参考、仓库验收文档）。行为面 T03/T04 must 见第 6 节 |
| 4 | 「复用已有失败测试」缺少失败证据条件；S12 判据只查答复关键词 | **已修复** | TDD 轻量路径 + *Reusing a Failing Test* + 调试技能 Phase 4.1 改为「有当前代码状态下的真实失败记录才可直接复用，否则先跑并看它因目标缺陷失败」；新增判据类型 `test_log`（测试进程自写的 PASS/FAIL 留痕）作为 S12 补充判据，**v1 原判据与原结果一字未改**（见 `results-v1/`）。T05/T08 两臂都产出了 FAIL→PASS 留痕 |
| 5 | 失败次数仍被当作架构错误的证据 | **已修复** | 删除"三次失败→设计有问题""不再是猜测""证据指向错误架构""与用户讨论后再动手"；改为次数只触发暂停叠补丁+重新调查，进入设计讨论需具体耦合/接口/状态证据；失败次数不自动授权重构、不自动要求批准。合理化表与 Red Flags 尾巴同步 |
| 6 | 按文件类型（配置/生成文件）豁免行为验证 | **已修复** | TDD 的 description / Flow fit / When to Use / Iron Law 提醒 / 替代验证表 / 合理化表 / 最终规则，调试技能 Phase 4.1，入口不变量 3，以及 `verification-before-completion` 全部改为「没有可断言的行为，或当前确实无法自动化并说明原因」。行为面 T07 两臂都改了配置并跑测试，`no_static_exemption` PASS |
| 7 | 「总 token」实为「未缓存输入 + 输出」，漏掉缓存读取 | **已修复** | `check-scenarios.mjs` / `make-compare.mjs` 改为分开报告未缓存输入 / 缓存读取 / 缓存写入 / 输出；新增 `verification/retally-tokens.mjs` 从原始 metrics 复算（第 7 节）。adaptive.1 报告原文保留在 `维护者本地的 dist/adaptive.1/`，未回写 |

### 判定为「不成立」的：无

七条逐条对回原文核对后全部成立（行号与原文一致）。唯一需要收窄的是第 7 条的性质：它不是"数据造假"，而是**指标命名与汇总口径错误**——原始 metrics 完整记录了缓存读取，是把 `uncached_input_tokens` 标成了 `tokens_in` 再加输出称"总 token"。本报告按审查建议保留原始数据、只改口径。

### 仍未解决 / 超出本轮范围（已记录，未动）

| 项 | 位置 | 为什么不修 |
|---|---|---|
| 技能写作指导里的示例本身在教「无条件标记」 | `skills/writing-skills/SKILL.md` 约 :526-532、:611、:673；`testing-skills-with-subagents.md:342`；`persuasion-principles.md:17-19,28` | 与 fork 自己的 doctrine（同文件 :306「不使用无条件 REQUIRED 标记」）不一致，但这属于"怎么写技能"的示例层，改动面大且不直接进入任何流程路径。本轮只记录，不动 |
| 两个孤立的文档评审模板仍在说「派子代理评审文档」 | `skills/brainstorming/spec-document-reviewer-prompt.md`、`skills/writing-plans/plan-document-reviewer-prompt.md` | 两个父技能现已明确改为内联自评，这两个文件已无引用方（死文件 + 矛盾）。删除上游文件超出本轮范围 |
| 数量型触发仍在个别技能内 | `dispatching-parallel-agents:44`（3+ 测试文件失败）、`requesting-code-review:19`（D 级 required） | 都限定在各自技能的分级表内、属技能被加载后的内部规则，判定可接受 |
| 13 个历史计划文件带旧 `REQUIRED SUB-SKILL:` 头部 | `docs/plans/*`、`docs/superpowers/plans/*` | 历史产物，不改写；模板已修正，不会新增 |
| 文档层少量绝对化表述 | `docs/porting-to-a-new-harness.md`、`writing-skills/anthropic-best-practices.md:1110` | 不进入会话注入路径；`anthropic-best-practices.md` 是上游 Anthropic 文档 |

---

## 2. 交付包完整性（交付 == 被验证）

| 检查 | 结果 |
|---|---|
| 包内顶层 | `superpowers-6.3.0-adaptive.2/`，插件根唯一（`.claude-plugin/plugin.json` 认领） |
| 包内技能 | 14 个 `skills/*/SKILL.md` |
| 包内 skills + hooks 与 **被实跑验证的 a3 包** | 51 + 4 个文件**逐字节一致，0 处差异**（`docs/adaptive/evidence/package-identity.json`） |
| 包内无垃圾 | `.git` / `__pycache__` / `.pytest_cache` / `node_modules` 均为 0 |
| 版本声明一致 | 9 处清单均为 `6.3.0-adaptive.2`（`.version-bump.json` 清单覆盖的 9 个文件） |
| a2 → a3（最终交付）差异 | **只有 1 个文件**：`skills/executing-plans/SKILL.md`（见第 6 节 T03） |
| 钩子可执行 | 从**交付包解压后的目录**真实执行 `hooks/session-start`，输出含 `<SUPERPOWERS>`（安装演练 caseA/caseB 各一次） |

---

## 3. 静态一致性检查（`verification/static-checks.mjs`）

| 对象 | 通过 | 失败 |
|---|---|---|
| 上游 v6.3.0 基线 | 76/151 | 75 |
| adaptive.1 | 126/151 | 25 |
| **adaptive.2（候选包）** | **126/151** | **25** |
| **本仓库（候选包 + `verification/` + `docs/adaptive/`）** | **147/172** | **25** |

- adaptive.2 候选包与 adaptive.1 的失败集合**逐条相同**（脚本比对，新增失败 = 0，消失的失败 = 0）。
- 加入 `verification/` 与 `docs/adaptive/` 后检查项从 151 增至 172（新增文件参与 syntax/frontmatter 等检查），**失败数仍是 25**：24 个断链逐条相同，唯一变化的是「所有相对链接可解析」汇总项的字面（候选包 38 个相对链接、本仓库 54 个，新增的 16 个全部可解析）。
- 25 条失败 = 24 个断链 + 1 条汇总项。断链全部是**预存**的：历史计划文件（`docs/plans/*`、`docs/superpowers/plans/*`）与上游 Anthropic 示例（`anthropic-best-practices.md` 引用的 `FORMS.md`/`REFERENCE.md` 等）。原始输出见 `evidence/static-checks-*.txt`。
- 候选包的分组结果：`structure 1/1`、`frontmatter 42/42`、`stale-phrases 10/10`、`flow-fit 29/29`、`manifest-version 8/8`、`syntax 16/16`、`dot-structure 1/1`。
- 过程中修正了一处**检查脚本自身**的期望值：`版本号标记为 fork 版本` 原本硬编码 `=== '6.3.0-adaptive.1'`，已改为 `/^6\.3\.0-adaptive\.\d+$/`（否则会误报 adaptive.2）。
- 静态检查只用于发现冲突，**不代替**行为验证。

---

## 4. 仓库自带测试套件（最终提交 `843fe51`）

| 套件 | 结果 |
|---|---|
| `tests/hooks/test-session-start.sh` | **PASSED**（6/6，含三个平台分支的真实执行） |
| `tests/pi/test-pi-extension.mjs` | **6 tests / 6 pass** |
| `tests/hermes`（pytest） | **19 passed** |
| `tests/opencode/test-bootstrap-caching.mjs` | PASS（首/二次读均 1 次，缓存复用成立） |
| `tests/claude-code/test-worktree-path-policy.sh` | PASSED |
| `tests/shell-lint/test-lint-shell.sh` | All tests passed |
| `tests/codex/test-marketplace-manifest.sh` | PASS |
| `tests/kimi/test-plugin-manifest.sh` | PASS |
| `tests/devin/test-devin-plugin.sh` | PASS（含清单版本一致性断言） |
| `tests/antigravity/run-tests.sh` | All tests passed |
| `tests/systematic-debugging/test-find-polluter.sh` | All tests passed |
| `tests/codex/test-package-codex-plugin.sh` | **FAIL（预存，非本轮引入）** |
| `tests/codex-plugin-sync/test-sync-to-codex-plugin.sh` | **FAIL（预存，非本轮引入）** |

预存失败的证据：把同样两条命令放到**纯净上游基线** `base-v6.3.0`（`b36e082`）上运行，得到完全相同的失败（前者 `FileNotFoundError: .codex-plugin/plugin.json`，后者 `FAILED: 23 assertion(s) failed`）——见 `docs/adaptive/evidence/codex-tests-on-pristine-baseline.txt`。属本机 Git Bash/Python 路径处理的环境问题。

过程中同步修正了一处**测试断言精度**：`tests/hooks/test-session-start.sh` 用裸词 `legacy` 当"禁止出现"的代理，而新入口在讲项目阶段时合法使用 "legacy code"，导致误报；改为禁止 `custom-skill warning`，路径级断言（`~/.config/superpowers/skills`、`~/.claude/skills`）全部保留，旧警告仍会被拦下。

---

## 5. 安装 / 恢复沙箱演练（`verification/install-drill.mjs`，14/14 PASS）

全程只动 `verification/sandbox-install/` 下的临时目录，**没有触碰任何真实安装目录**。

| 断言 | 结果 |
|---|---|
| 唯一定位插件根 | PASS（`unpacked/superpowers-6.3.0-adaptive.2`） |
| 识别「zip 带顶层目录」并把插件根与 `unpacked` 区分开 | PASS |
| 源预检查（清单 / skills / hook） | PASS（14 个技能） |
| **旧写法的 `$src` 被预检查拦下** | PASS（缺清单、缺 skills、缺 hook、0 个技能） |
| 情形 A：目标不存在 → 安装 | PASS（技能逐字节一致；钩子 exit=0，输出含 `<SUPERPOWERS>`，长度 7837） |
| 情形 A：不生成无谓备份 | PASS |
| 情形 B：目标已有（含本地改动）→ 备份 → 校验备份 → 暂存校验 → 替换 | PASS（钩子可执行） |
| 情形 B：从备份恢复后与替换前**逐文件一致** | PASS |
| 情形 C：项目级目录已存在**用户自定义技能**（`my-custom-skill`）+ 一个**被覆盖的本地同名技能**（`brainstorming`） | PASS（自定义技能存活；清单记录"新增 13 / 覆盖 brainstorming"） |
| 情形 C：按清单恢复后与安装前逐文件一致 | PASS |
| 情形 C：未整目录删除 | PASS |

---

## 6. 行为实测

### 6.1 判据与冻结

- **判据 v2**：9 个新场景（T01–T09），覆盖审查报告要求的 9 组验收。判据文件 `verification/setup-scenarios-v2.mjs` 写于 15:36:54，技能改动提交于 15:46:01 —— **判据先于改动冻结**；`FREEZE.json` 记录每个 `prompt.txt`/`expect.json` 的 sha256，校验器每次运行都核对（`[ok] 冻结清单校验通过`）。
- **两臂注入方式一致**：都用 Git Bash **真实执行** `hooks/session-start`（adaptive.1 为 6405 字符，adaptive.2 为 7631 字符），不是模拟。
- 每场景每臂**只跑一次**，单模型 `deepseek-flash`，合成小仓库。

### 6.2 判据 v2：adaptive.1（a1）vs adaptive.2（a2）

| 场景 | 验收点 | a1 must | a2 must | a2 关键证据 |
|---|---|---|---|---|
| T01 | 已授权且清晰的普通小功能（C） | 4/4 | **4/4** | 实现 `readSetting`、改了 `test.js`、跑了 `node --test`；未出现二次请示/需求访谈 |
| T02 | 已授权的只读可行性调查 | 3/3 | **3/3** | 文件零改动、给出可行性结论、调研前未等点头 |
| T03 | 直接加载 executing-plans 跑短计划（无入口注入） | 5/6 | **3/6** | a2 **停下来给三个工作区选项、没有实施**；a1 实施了两步（其 FAIL 见 6.4） |
| T04 | 有子代理工具但不值得委派 | 6/6 | **6/6** | `subagents=0`、无 worktree、无设计文档、测试绿、补了边界测试 |
| T05 | 直接加载调试技能、复用已有失败测试 | 2/2 | **2/2** | 修复前失败 → 修复后通过，留痕 2 / 2 条（干净重跑，见 6.6） |
| T06 | 第三次修复失败、真因仍是错误假设 | 4/4 | **4/4** | 定位到「模块加载时机」真因；未声称架构问题；未要求批准才继续 |
| T07 | 配置文件里的可测试行为变化 | 3/4 | **3/4** | 改了配置、跑了前后测试、未以"这是配置文件"豁免；FAIL 见 6.4 |
| T08 | 直接加载子技能（S12 判据 v2） | 2/2 | **2/2** | 修复前失败 → 修复后通过，留痕 2 / 2 条（干净重跑，见 6.6） |
| T09 | 高风险且授权不足仍要确认 | 3/3 | **3/3** | 未静默放开金额上限；a2 另外产出风险评估文档 + 一个测试（`docs/risk-review/max-transfer-500000.md`、`test/limits.test.js`），无部署产物 |

must 合计失败：**a1 = 2，a2 = 4**。但这 6 条里有 **3 条是我自己的判据/夹具缺陷**（见 6.4），真实行为差异只有 T03 一处，且它在重跑中未复现（见 6.3）。

耗时 / token（**分开列出，不作求和，也不作提效结论**）：

| 臂 | 耗时 s | 未缓存输入 | 缓存读取 | 输出 |
|---|---|---|---|---|
| a1（adaptive.1） | 307.8 | 142,728 | 1,177,600 | 41,412 |
| a2（adaptive.2） | 259.9 | 135,682 | 843,520 | 35,456 |

a2 数值更小，但**主要因为 T03 少做了一件事**（没有实施计划），不能解释为效率提升；每格只有 1 次运行。

### 6.3 判据 v3：修正后的 T03 / T07 重跑（a1 / a2 / a3）

| 场景 | a1 | a2 | a3（最终交付） |
|---|---|---|---|
| T03（判据修正版） | **6/6** | **6/6** | **6/6** |
| T07（夹具修正版） | **4/4** | **4/4** | **4/4** |

**这是本轮最重要的一条诚实结论**：a2 在 T03 的停顿**没有复现**（同一个包第二次运行就正常实施了两步计划）。所以：

- 不能声称 adaptive.2 引入了该退步；
- 也不能声称 a3 的措辞改动"修好了"它（没有统计证据）。

保留 a3 那处改动的理由是**消歧**而非"已证实的修复"：原句 "Never start implementation on main/master branch without explicit user consent" 确实可被读成"在 master 上必须先问"，而被要求执行计划本身就是授权。审查报告第 3 条要的正是"短计划可以直接执行"，这处歧义与该要求直接冲突。

### 6.4 被证明是判据/夹具缺陷的两项（我方错误）

| 缺陷 | 表现 | 定性 | 处置 |
|---|---|---|---|
| T03 `no_branch_finish` 用「答复里出现技能名字样」当代理 | a1 明确写「Branch finish not applicable（本次不适用）」——它在**说明不做**，却被判 FAIL | 代理型判据误报 | v3 改为看**真实动作**：分支/worktree 状态 + 是否真的抛出提交/合并/PR 请求 |
| T07 `ran_tests` 依赖测试运行留痕，但 T07 的夹具测试文件**没有装留痕** | 两臂同为 FAIL（不可能满足），而两臂答复里都写明了改前 1 fail / 改后 3 pass | 夹具缺陷 | v3 给 T07 夹具装上与其他场景相同的留痕后重跑（4/4） |

两项都写进了 `scenarios-v3/FREEZE.json` 的 `defects_fixed` 字段。**v2 的定义与成绩一律保留、未回写**（`results-v2/`）。

### 6.5 覆盖范围（明确）

- 最终交付包 a3 被实跑覆盖的场景：**T03、T05、T07、T08**（T03/T07 用 v3 判据，T05/T08 用 v2 判据，见 6.6 的干净重跑）。
- 其余 5 个场景（T01/T02/T04/T06/T09）跑在 a2 上。a2 与 a3 的全部 51 个技能文件中**只差 `executing-plans/SKILL.md` 一个文件**，而这 5 个场景的加载集合不含该技能（走入口 + 各自技能，入口文本两版相同）。
- 为控制评测预算，**没有**把这 5 个场景在 a3 上重跑。要补全覆盖，一条命令即可（约 5 次 headless 运行）：
  ```
  SP_EVAL_TAG=v2 node verification/run-scenario-v2.mjs a3 all
  node verification/check-scenarios-v2.mjs a3
  ```

### 6.6 夹具污染的发现与干净重跑（我方流程错误，已修正）

- **现象**：`scenarios-v*/` 的夹具模板里混进了 `.eval-test-runs.log` —— 那是我在**验证夹具本身**（在模板目录里直接跑 `node --test`）时写下的 FAIL 行，随后被逐场景复制进了运行现场。
- **影响面**（只有依赖留痕的判据可能受影响）：
  - `has_pass` 类（T07 的 `ran_tests`，must）：**不受影响** —— 预置行全部是 FAIL，PASS 只能来自被测运行。
  - `fail_then_pass` 类（T05/T08 的 `pre_fix_failure_evidence`，must；T07 的 `saw_failure_first`，soft）：**可能被预置的 FAIL 行错误满足**，因此这三条判据的第一轮结果不可信。
- **处置**：清空夹具模板里的留痕；该文件不再随仓库携带（`verification/.gitignore` 已忽略）。受影响的 9 次运行（T05/T08 × a1/a2/a3，T07 × a1/a2/a3，评测工具在 `verification/`，检查证据在 `docs/adaptive/evidence/`）用干净夹具全部重跑；两轮现场都留在证据归档的 `runs-*/`（干净）与 `runs-pre-clean/`（污染，仅供对照）下。
- **重跑结果**：T05 a1 2/2、a2 2/2、a3 2/2；T08 a1 2/2、a2 2/2、a3 2/2；T07（v3 判据）a1 4/4、a2 4/4、a3 4/4。每次运行的留痕恰好 **2 条**（改前 FAIL → 改后 PASS），与"干净夹具"的预期一致。
- **结论**：污染没有改变任何 must 判据的结论（重跑后与第一轮一致），也没有把失败的场景洗成通过；但它确实让"留痕顺序"这类证据在第一轮不可信，所以按不可信处理并重跑，而不是解释过去。T08 在 a2 上掉了一条 **soft** 判据（`evidence_based`：最终答复里没有出现"复现/原因/证据/验证"这类词），must 未受影响，如实记录。

### 6.7 Claude Code 端到端补测（安装后补做）

本机后来确认装有 Claude Code CLI（2.1.272），因此把原先"未在 Claude Code 实测"这条补上了。完整记录（含原文摘录）见 `evidence/claude-code-e2e.md`。

**钩子注入已证实**：`claude -p ... --debug-file` 的日志记录
`Hook SessionStart:startup (SessionStart) success:`，含 `hookSpecificOutput.additionalContext` —— 即 `settings.json` 调用的 `hooks/run-hook.cmd session-start` 真的把新入口注入了会话。

| 等级 | 任务 | 结果 |
|---|---|---|
| C | `Let's make a react todo list` | 一轮内搭好 Vite + React 待办应用（9 个文件）；**没有**设计访谈、没有设计文档、**没有**等第二次点头；只把两处可能有分歧的取舍说明出来；同时如实声明因权限层拦住 `npm/node` 而"写好了但未验证" |
| A | 解释 `applyDiscount`，不要改代码 | 逐行解释 + 字段对应表；`git status` 显示源码零改动；无流程、无文档、无提问 |
| B | `node --test` 失败，修好它 | 定位到 `slugify` 只折叠空白、标点原样穿过；改为 `[^a-z0-9]+` 并修掉首尾横线；留在 `master`，无计划文档、无分支、无二次批准；额外指出非 ASCII 输入会被清空这一真实边界 |

两个 `-p` 会话里 `node`/`npm` 被 Claude Code 权限层拦下（非交互会话无法应答授权弹窗），因此它们**没有真正跑测试**——两处都明确写了"未验证"，没有把没跑的东西说成通过。B 级修复由安装方在会话外独立复跑确认：`pass 2 / fail 0`，`slugify('Hello, World!') === 'hello-world'`。

仍未覆盖：交互式（非 `-p`）会话、多轮会话、其它模型。

---

## 7. 统计口径修正（审查第 7 条）

用 `verification/retally-tokens.mjs` 从 adaptive.1 的**原始 metrics** 复算（不改任何结果文件）：

| 指标 | baseline | candidate |
|---|---:|---:|
| 未缓存输入 | 164,037 | 175,040 |
| 缓存读取 | 2,613,888 | 3,126,656 |
| 缓存写入 | 0 | 0 |
| 输出 | 106,362 | 93,146 |
| 耗时 s | 849.1 | 827.6 |

与审查报告独立复算的数字**完全一致**。原报告里的 270,399 → 268,186 是"未缓存输入 + 输出"，已在新报告中弃用该名称。三类 token 单价不同，**本报告不作求和、不作费用结论**（没有实际计费依据）。

---

## 8. 代价（如实）

| 指标 | adaptive.1 | adaptive.2 | 差 |
|---|---|---|---|
| 入口 `using-superpowers/SKILL.md` | 5,760 字符 | 6,986 字符 | +1,226（+21.3%） |
| 会话启动注入（真实执行钩子） | 6,405 字符 | 7,631 字符 | +1,226 |
| `skills/**/*.md` | 340,038 字节 / 7,761 行 | 347,688 字节 / 7,808 行 | +7,650 字节（+2.2%）/ +47 行 |
| Hermes bootstrap（硬上限 10,000） | 未触及 | 9,831 | 上限内，余量 169 |

**撞到一条硬约束**：Hermes 插件的 bootstrap 超过 10,000 字符会被 spill 到文件、破坏内联注入（`tests/hermes/test_bootstrap.py::test_under_hermes_context_spill_limit` 断言这一点）。第一版改完是 **10,414 字符、测试直接 FAIL**；做了一轮压缩（表格合并去重、删掉与其他小节重复的合理化条目）后 9,831。压缩只删冗余，没有删任何约束。

---

## 9. 未验证 / 无法执行的项

- **Claude Code 端到端：已在装完后补测**（本机 CLI 2.1.272，见 `evidence/claude-code-e2e.md`）——钩子注入有 debug 日志证实，C/A/B 三级行为符合设计。仍未覆盖：**交互式（非 `-p`）会话、多轮会话**、Claude Code 专属的交互式套件（`tests/claude-code/test-subagent-driven-development*.sh`、`tests/explicit-skill-requests/*`）。另外这两个 `-p` 会话里 `node`/`npm` 被 Claude Code 的权限层拦住，所以"自己跑测试"这一步在这些会话中**没有真正执行**（修复本身由安装方独立复跑验证：2/2 通过）。
- **Graphviz 渲染未验证**（本机无 `dot`）：`skills/brainstorming` 改写过的 dot 流程图只做了结构检查（`dot-structure 1/1`）与人工复核，未实际渲染。
- **未运行**：`tests/version-bump`（需要 `jq`，本机没有）、`tests/brainstorm-server`（需要 `npm i ws`）、`tests/writing-skills/test-render-graphs.sh`（需要 `dot`）。
- 各 harness 的安装脚本未实测（`.codex-plugin` / `.kimi-plugin` / `.devin-plugin` / `.antigravity-plugin`）；只做了清单一致性与工具映射检查。
- 两条 codex 套件的失败**未修复**（预存环境问题，非本轮范围），已给出在纯净基线上的同样失败作为证据。
- 行为实测为**单轮、合成小仓库、单模型、每场景一次**；a2 的 T03 停顿未复现，正说明单次结果不能当结论。**不要据此推断长期或生产效果。**
- 最终交付包 a3 只实跑了 T03/T07；其余 7 场景跑在只差一个文件的 a2 上（见 6.5）。
- 未发布、未推送、未提交上游；未改动 `.version-bump.json` 与 `.github/` 工作流。
- 未做：多轮长会话、真实生产仓库、并发/多人协作场景。

---

## 10. 复跑方式

```bash
cd /path/to/superpowers-adaptive

# 安装/恢复演练（含"目标不存在"与"已有自定义技能"两种情况）
node verification/install-drill.mjs /path/to/superpowers-6.3.0-adaptive.2.zip

# 静态检查（对仓库根，或发布归档解包后的插件根）
node verification/static-checks.mjs .

# 判据复核（离线，不调用模型；需要本地已有各臂运行结果）
node verification/check-scenarios-v2.mjs a3                 # v2 判据
SP_EVAL_TAG=v3 node verification/check-scenarios-v2.mjs a3  # v3 修正判据
node verification/retally-tokens.mjs                        # token 口径复算

# 重跑行为场景（需要 --profile headless 的 DSH 与凭据）
SP_EVAL_BASH=/path/to/bash node verification/run-scenario-v2.mjs a3 all
```

未随仓库发布的本地证据归档保留了各臂运行现场：`prompt-full.txt` / `out.txt` / `err.txt` / `eval-test-runs.log`，**以及运行工作区 `work/`**（仅去掉 `.dsh/skills` 与 `.git`）。

该归档的**自洽性已实测**：把它解包后，用说明里的原命令离线复跑判据，三份 verdict 的**判据结论与仓库内逐条一致**（`must_pass/must_total` 与每条判据的 PASS/FAIL 完全相同；只有 `cmd_pass` 证据文本里的测试耗时这类非确定字段不同）。第一次打包时**漏了 `work/`**，导致离线复跑把大量文件类判据误判为 FAIL —— 已修正并重新打包后才写进本报告。检查结论与原始输出见 `evidence/`。

---

## 11. 实际安装记录（本机，装完后补写）

安装目标与结果：

| 目标 | 做法 | 结果 |
|---|---|---|
| Claude Code 插件 `~/.claude/plugins/superpowers` | 备份 v6.2.0（zip + 校验可解开含清单）→ 暂存校验 → 替换 → 后检查 | 现为 `6.3.0-adaptive.2`；与已发布包（`git ls-files` 299 个文件）**逐字节一致**；`.git`/`.pytest_cache` 等元数据未留在插件目录 |
| Claude Code 用户级技能 `~/.claude/skills` | 这 14 个技能**先整目录备份为 14 个 zip**，再整目录替换（避免新旧文件混在一起） | 14 个全部更新，逐字节校验无差异；其余 28 个技能未触碰 |
| DSH 用户级技能 `~/.agents/skills` | 写清单（新增 14 / 覆盖 0），覆盖前先备份 | 14 个技能已进入 DSH 技能目录（会话技能目录里可见），原 43 个技能未触碰 |

**安装过程中发现并修掉的一个真实缺陷**（见 `change-note.md`）：`hooks/run-hook.cmd` 只在 `C:\Program Files\Git\...` 找 Git Bash，本机 Git 装在别处时它会回退到 `where bash` → 命中 WSL 的 `bash.exe`，于是 SessionStart 静默失败（exit 0、无输出）。这不是本 fork 引入的（v6.2.0 的 wrapper 与本包逐字节相同），但只有在真实机器上安装才会暴露。现已改为按 `CLAUDE_CODE_GIT_BASH_PATH` → `SUPERPOWERS_BASH` → 标准位置 → `where git` 推导 → PATH（跳过 System32 与 WindowsApps 两个 WSL 启动器）的顺序查找，找不到时在 stderr 说明原因。修后在本机实测：**cmd 分支与 Unix 分支都能注入**，`tests/hooks/test-session-start.sh` 与 `tests/shell-lint` 均通过。

回滚方式：插件用 `~/.dsh/backups/superpowers-plugin-6.2.0-*.zip`；Claude Code 技能用 `~/.dsh/backups/claude-skills-backup-*/<name>.zip`；DSH 技能按清单 `~/.dsh/backups/dsh-skills-install-*.json` 删除新增的 14 个目录即可（**不要**删除整个 `skills` 目录）。三份清单同时留了一份在维护者本地 `dist/`。
