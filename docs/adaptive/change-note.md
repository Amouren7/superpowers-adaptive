> Repo edition: paths below are adjusted to this repository (tooling in `verification/`, check evidence in `docs/adaptive/evidence/`). The original delivery copies stay in the maintainer's local `dist/`, which is not published.

> 仓库版：下列路径已按本仓库结构调整（评测工具在 `verification/`，检查证据在 `docs/adaptive/evidence/`）；原始交付版保留在维护者本地 `dist/` 中，未随仓库发布。


# 变更说明 — superpowers **6.3.0-adaptive.2**

> 基线：adaptive.1（commit `f01828a`）→ adaptive.2（commit `77270e9`，含 `803d75f`）；上游基线 `b36e082` = v6.3.0。
> 本轮**没有**推翻 adaptive.1 的分级设计，只消解「入口说按需、子技能仍强制」的新旧流程冲突，并按第二份审核补了四项轻量增强。
> 审查意见逐条核实后的处理结果见 `verification-report.md` 第 1 节（七项处理表，含「不成立及证据」与「仍未解决」）。

## 一、修了什么（按审查报告条目）

| # | 问题 | 处置 |
|---|---|---|
| 1 | 安装说明复制错目录层级；校验前清空旧安装；项目级恢复靠删整个目录 | `install-restore.md` 重写：用真正的插件根 + 三项预检查；备份**并校验备份**、暂存验证后才替换；项目级安装写清单（新增/覆盖）并备份被覆盖项，恢复按清单回滚。`verification/install-drill.mjs` 把同一套步骤变成可执行演练（14/14 PASS），其中一条专门断言**旧的错误 `$src` 会被预检查拦住** |
| 2 | brainstorming 对 C 级的批准要求自相矛盾（Bounded 无条件 STOP、Spike 要 nod、存疑取重） | Bounded 改为「说出方案即继续，只有业务行为/范围/风险/授权存在实质未决事项时才等」；Spike 只读探针无需二次点头（写盘/花钱/破坏性操作才要）；「存疑取重」改为「先做有界只读调查，再由证据决定」；HARD-GATE、清单、Red Flags、dot 图同步改写，不只是加顶部豁免 |
| 3 | executing-plans 按「工具是否存在」强制进入子代理/工作区/分支收尾 | 删除「有子代理就必须用 subagent-driven-development」；worktree 仅在确实需要隔离（长/险/并行/用户要求）时使用；分支收尾只在本次真的做了分支生命周期工作或被要求时进入。另修一处**歧义**（commit `77270e9`）：原句「在 main/master 上未经用户明确同意不得开始实施」没有区分「被要求做的事」与「未经要求擅自动 main」，实测出现过把已批准的两步计划读成「必须先问」而停下的情况（`verification-report.md` 第 6.3 节：该停顿第二次运行未复现，因此这是消歧而非已证实的修复） |
| 4 | 「复用已有失败测试」缺少失败证据条件；S12 判据只查答复关键词 | TDD 轻量路径与「Reusing a Failing Test」改为：有当前代码状态下的真实失败记录才可直接复用，否则**先跑并看它因目标缺陷失败**；新增判据类型 `test_log`（测试进程自己写的 PASS/FAIL 留痕）作为 S12 补充判据，v1 原判据与原结果一字未改 |
| 5 | 失败次数仍被当作架构错误的证据 | systematic-debugging 删掉「三次失败→设计有问题」「不再是猜测」「证据指向错误架构」「与用户讨论后再动手」等表述；改为**次数只触发暂停叠加补丁与重新调查**，只有具体耦合/接口/状态模型证据才进入设计讨论；失败次数不自动授权重构，也不自动要求用户批准下一次有依据的调查 |
| 6 | 按文件类型（配置/生成文件）豁免行为验证 | TDD description/Flow fit/When to Use/Iron Law 提醒/替代验证表/合理化表/最终规则，以及 systematic-debugging Phase 4.1，全部把豁免理由从「文件类型」改为「没有可断言的行为变化，或当前确实无法自动化并说明原因」；明确配置与生成文件照样承载权限、路由、金额、契约行为 |
| 7 | 「总 token」实为「未缓存输入 + 输出」，漏掉缓存读取 | `check-scenarios.mjs` 与 `make-compare.mjs` 改为分开报告未缓存输入/缓存读取/缓存写入/输出，不再出现「总 token」；新增 `verification/retally-tokens.mjs` 从原始 metrics 复算。adaptive.1 报告原文保留在 `adaptive.1/`，未回写 |

## 二、交叉引用审计（防止从别的入口绕回强制流程）

审查报告第 3 条要求「同步检查交叉引用，防止从其他入口绕回强制流程」。本轮做了一次全量审计（skills/** + hooks/** + docs/** + CLAUDE.md），修掉会被绕回的入口：

- `writing-plans`：计划文件头模板原本往**每一个未来计划**里盖 `Use subagent-driven-development (recommended)` 的章，改为「按任务是否独立选择 inline 或委派」。
- `subagent-driven-development`：分支收尾从无条件一行改为「本就工作在分支上才收尾」；模型升级从仪式改为按风险缩放。
- `using-superpowers/references/antigravity-tools.md`：「任何多步任务都要建 task artifact」改为 C/D 级才建。
- `CLAUDE.md`、`docs/porting-to-a-new-harness.md`、`docs/README.kimi.md`：把验收口径从「必须在写码前加载 brainstorming」改为「按 C 级说出简短方案再写码，不做完整设计访谈、不等第二次点头」；顺手修掉 `porting` 里两处引用了**已不存在条文**的过期引用。

## 三、采纳第二份审核的四项 / 拒绝三项

采纳（都压缩进既有文件，没有新增技能或配置系统）：

1. **风险升级清单**：认证授权 / 支付计费金额阈值 / 数据库 schema 与迁移 / 公共 API 与契约 / 生产配置与发布链路 / 安全边界与他人数据 —— 命中即「至少 C，通常 D」，一行改动也不例外。
2. **项目约束与阶段优先**：项目自己的 `CLAUDE.md`/`AGENTS.md`/`README`/`HANDOFF`/`docs/` 与所处阶段（原型/开发/维护/遗留）先于分级表生效；不熟悉的或遗留代码先看再改。
3. **分级验证下限**：A 无事可跑 / B 针对性检查并引用运行 / C 变更的行为测试 + 周边测试 / D 该区域全量 + diff 复核 + 设计里点名的风险控制。
4. **反仪式条款**：不要产出该等级不需要的计划、设计文档、确认、待办或子代理派发；流程不是尽责的证明。

拒绝（并说明理由）：

1. **新增三个模块**（`risk-router.md` / `project-state.md` / `verification-policy.md`）：与审查报告「不新增庞大配置或评分系统」直接冲突，且会新增技能发现与调用成本；其内容已按最小形态并入入口技能与 `verification-before-completion`。
2. **「连续 5 次 A 级任务后进入快速模式」**：引入新的会话状态机，没有证据支持，且与「风险可在任意一轮出现」相冲突；会话内既有的「已加载且未变化不再重读」已覆盖其真实诉求。
3. **按项目阶段联动默认等级的项目状态文件**：需要维护一份会过期的状态；改为读项目自己的文档（已采纳的第 2 项），不新增事实源。

## 四、代价（如实）

| 指标 | adaptive.1 | adaptive.2 | 差 |
|---|---|---|---|
| 入口技能 `using-superpowers/SKILL.md` | 5,760 字符 | 6,986 字符 | **+1,226（+21.3%）** |
| 会话启动注入整体（真实执行钩子） | 6,405 字符 | 7,631 字符 | +1,226 |
| `skills/**/*.md` | 340,038 字节 / 7,761 行 | 347,688 字节 / 7,808 行 | +7,650 字节（+2.2%）/ +47 行 |
| Hermes bootstrap（硬上限 10,000） | — | 9,831 字符 | 上限内，余量 169 |

入口变大是客观成本。**入口撞到一条硬约束**：Hermes 插件的 bootstrap 超过 10,000 字符会被 spill 到文件、破坏内联注入（`tests/hermes/test_bootstrap.py` 就在断言这一点）。第一版改完是 10,414 字符、测试直接 FAIL，因此做了一轮压缩（表格合并、去重、删掉与其他小节重复的合理化条目），最终 9,831。压缩只删冗余，没有删任何约束。

技能正文这一轮只涨 2.2% —— 因为改动以**原地重写规则**为主，没有另起一套流程。

## 五、这轮没有做

- 没有推翻 adaptive.1 的 A/B/C/D 设计与六条不变量，只修冲突项。
- 没有改 `RELEASE-NOTES.md`、`docs/superpowers/plans|specs/*` 等历史记录；没有删上游招牌内容（Red Flags 表、"your human partner" 用语等）。
- 没有新增技能目录、没有新增配置/评分系统、没有引入第三方依赖。
- 没有动 `.version-bump.json`、`.github/` 发布流程；没有推送、没有开 PR、没有发布。
- 已知仍未解决的项（含交叉引用审计里判定为「超出本轮范围」的）列在 `verification-report.md` 第 1 节末与第 6 节。
