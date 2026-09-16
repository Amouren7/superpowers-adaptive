> Repo edition: paths below are adjusted to this repository (tooling in `verification/`, check evidence in `docs/adaptive/evidence/`). The original delivery copies stay in the maintainer's local `dist/`, which is not published.

> 仓库版：下列路径已按本仓库结构调整（评测工具在 `verification/`，检查证据在 `docs/adaptive/evidence/`）；原始交付版保留在维护者本地 `dist/` 中，未随仓库发布。


# 安装与恢复说明（Superpowers Adaptive **6.3.0-adaptive.2**）

> 本文件只描述**你**要做的动作。本次交付**没有**动任何已安装的技能、全局配置或发布通道。
> 发布归档 = 本仓库内容套一层 `superpowers-6.3.0-adaptive.2/` 顶层目录；直接 clone 本仓库同样可用（见根 README）。

## 交付清单

| 文件 | 说明 |
|---|---|
| 仓库根 | **候选包本体**：skills / hooks / 9 个 harness 清单 / tests / docs / `verification/`。包内 skills 与 hooks 已逐字节校验 == 被实跑评测的那一份 |
| `docs/adaptive/change-note.md` | 变更说明：本轮修了什么、逐项依据、代价与未做的事 |
| `docs/adaptive/verification-report.md` | 验证报告：审查七项处理表、静态检查、仓库测试、安装/恢复演练、行为实测（含未验证项） |
| `docs/adaptive/install-restore.md` | 本文件：安装、试用、恢复 |
| `docs/adaptive/evidence/` | 各检查的原始输出、安装演练报告、逐文件哈希 |
| `verification/` | 评测工具：场景、判据、运行器、校验器、安装演练 |

本地提交：分支 `adaptive-flow`，commit **`77270e9`**（含 `803d75f`；adaptive.1 = `f01828a`，上游基线 `b36e082` = v6.3.0）。

## 一、这个包是什么

- 基于 **obra/superpowers v6.3.0**（commit `b36e082`）的 fork，MIT 许可与上游署名完整保留。
- 版本号 `6.3.0-adaptive.2`（`package.json`、`.claude-plugin/*`、`.codex-plugin`、`.cursor-plugin`、`.devin-plugin`、`.kimi-plugin`、`.hermes-plugin/plugin.yaml`、`gemini-extension.json` 共 9 处一致）。
- adaptive.2 相对 adaptive.1：消解「入口说按需、子技能仍强制」的新旧流程冲突；新增风险升级清单、项目约束优先、分级验证下限、反仪式条款；修正 token 统计口径。详见 `change-note.md`。
- `RELEASE-NOTES.md`、`docs/superpowers/plans|specs/*` 等历史记录保持原样未改写。

## 二、当前环境状态（重要）

你在本机**已安装**的东西**没有任何改动**：

| 项 | 位置 | 状态 |
|---|---|---|
| 已装技能（43 个） | `C:\Users\28198\.agents\skills` | 未改动 |
| Claude Code 侧技能副本 | `C:\Users\28198\.claude\skills` | 未改动 |
| superpowers 插件（v6.2.0）与其 SessionStart 钩子 | `C:\Users\28198\.claude\plugins\superpowers`、`~/.claude/settings.json` | 未改动 |
| 上游源码克隆 | `D:\Deepseek Project\.skill-setup\repos\superpowers` | 未改动（只读引用） |

本次所有改造都在独立工作目录 `D:\Deepseek Project\superpowers-adaptive\repo`（分支 `adaptive-flow`）。

## 三、通用预检查：先确认「插件根」，再谈复制

**这一节是一个真实的坑**：压缩包带顶层目录，`Expand-Archive` 之后真正的插件根是
`unpacked\superpowers-6.3.0-adaptive.2\`，**不是** `unpacked\`。把 `unpacked\*` 复制进插件目录，
清单和钩子会落在多一层的子目录里，Claude Code 再也找不到它们。

下面的步骤只用 `$src`（真正的插件根），并在复制前做三项预检查：清单、`skills/`、`hooks/session-start`。

```powershell
$zip      = "C:\path\to\superpowers-6.3.0-adaptive.2.zip"
$unpacked = "C:\path\to\unpacked-adaptive.2"
Expand-Archive $zip -DestinationPath $unpacked -Force

# 唯一确定插件根（按 .claude-plugin\plugin.json 认领，而不是猜目录名）
$roots = Get-ChildItem $unpacked -Directory | Where-Object { Test-Path (Join-Path $_.FullName '.claude-plugin\plugin.json') }
if ($roots.Count -ne 1) { Write-Error "无法唯一定位插件根（找到 $($roots.Count) 个）——停止，不要继续复制"; return }
$src = $roots[0].FullName
"插件根 = $src"

# 预检查：清单 / skills / 钩子必须在插件根这一层
$missing = @()
foreach ($p in @('.claude-plugin\plugin.json', 'skills', 'hooks\session-start')) {
  if (-not (Test-Path (Join-Path $src $p))) { $missing += $p }
}
$nSkills = (Get-ChildItem (Join-Path $src 'skills') -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }).Count
if ($missing.Count -gt 0) { Write-Error "插件根缺少：$($missing -join ', ')"; return }
if ($nSkills -lt 10) { Write-Error "skills 看起来不完整（只找到 $nSkills 个带 SKILL.md 的技能）"; return }
"预检查通过：$nSkills 个技能"
```

`verification/install-drill.mjs` 就是这一段 + 后面第四、五节的可执行版本，本地演练记录见 `verification-report.md`。

## 四、试用这个候选包（推荐：先隔离试用）

### 方式 1：交给 Claude Code 临时加载（不改动已安装版本）
```bash
claude --plugin-dir "D:\Deepseek Project\superpowers-adaptive\repo"
```
`--plugin-dir` 只对本次会话生效，不写入你的插件配置，退出即还原。

### 方式 2：在某个项目里让 DSH 读取本包的技能（本项目评测用的就是这种方式）

**不要假定 `.dsh\skills` 原来不存在，也不要用「删掉整个目录」来恢复** —— 那里可能已经有你自己的技能。
正确做法是：记录本次新增与覆盖了哪些技能，覆盖前先备份，恢复时只回滚这些。

```powershell
$src  = $roots[0].FullName                       # 第三节算出的插件根
$proj = "D:\path\to\your\project"                # 改成你的项目目录

$dst          = Join-Path $proj ".dsh\skills"
$manifestPath = Join-Path $proj ".dsh\skills-install-manifest.json"
$backupRoot   = Join-Path $proj ".dsh\skills-backup"

New-Item -ItemType Directory -Force $dst, $backupRoot | Out-Null
$added = @(); $overwritten = @()
foreach ($d in (Get-ChildItem (Join-Path $src 'skills') -Directory)) {
  if (-not (Test-Path (Join-Path $d.FullName 'SKILL.md'))) { continue }
  $to = Join-Path $dst $d.Name
  if (Test-Path $to) {                                 # 已存在：先备份再覆盖
    Copy-Item $to (Join-Path $backupRoot $d.Name) -Recurse -Force
    $overwritten += $d.Name
  } else { $added += $d.Name }
  Copy-Item $d.FullName $to -Recurse -Force
}
@{ src = $src; added = $added; overwritten = $overwritten; at = (Get-Date).ToString('o') } |
  ConvertTo-Json | Set-Content $manifestPath -Encoding UTF8
"新增 $($added.Count) 个，覆盖 $($overwritten.Count) 个；清单：$manifestPath"
```

**恢复（第六节方式 2）只按清单回滚**：删除本次新增的，把覆盖过的从备份还原。你自己原有的其它技能一动不动。

### 方式 3：只读审查（不安装）
直接读 `repo/skills/using-superpowers/SKILL.md`（分级规则唯一事实源）与各技能的 `## Flow fit` 小节。

## 五、如果你决定替换已安装版本

**先备份、校验备份、暂存验证，最后才动目标目录。源目录或备份没校验通过，就不要清空任何东西。**

```powershell
# 0) 第三节的 $src 必须已经通过预检查
$dst    = "$env:USERPROFILE\.claude\plugins\superpowers"
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$env:USERPROFILE\.dsh\backups\superpowers-plugin-$stamp.zip"
New-Item -ItemType Directory -Force (Split-Path $backup) | Out-Null

# 1) 备份并校验备份（能重新解开、且含插件清单）
Compress-Archive -Path "$dst\*" -DestinationPath $backup -Force
$verify = Join-Path $env:TEMP "sp-backup-verify-$stamp"
Expand-Archive $backup -DestinationPath $verify -Force
if (-not (Test-Path "$verify\.claude-plugin\plugin.json")) { Remove-Item $verify -Recurse -Force; Write-Error "备份校验失败 —— 未做任何替换"; return }
Remove-Item $verify -Recurse -Force

# 2) 暂存新版本并校验暂存
$stage = Join-Path $env:TEMP "sp-stage-$stamp"
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item "$src\*" $stage -Recurse -Force
if (-not (Test-Path "$stage\.claude-plugin\plugin.json")) { Write-Error "暂存校验失败 —— 目标未改动"; return }

# 3) 此时才替换
Remove-Item "$dst\*" -Recurse -Force
Copy-Item "$stage\*" $dst -Recurse -Force
Remove-Item $stage -Recurse -Force

# 4) 后检查：清单/技能/钩子必须在插件根这一层，且钩子能跑出新入口
Get-ChildItem $dst | Select-Object Name
bash "$dst\hooks\session-start" | Select-String 'SUPERPOWERS'
```

要点：
- `~/.claude/settings.json` 里的 `CLAUDE_PLUGIN_ROOT` 与 SessionStart 钩子指向该插件目录，**路径不变就不用改配置**。
- 钩子现在注入的是新的 `<SUPERPOWERS>` 自适应入口；若你的 `settings.json` 里钩子命令写的是 `run-hook.cmd session-start`，无需修改。

## 六、恢复

1. **还原 Claude Code 插件**（用第五节第 1 步的备份 zip）：
   ```powershell
   $backup = "$env:USERPROFILE\.dsh\backups\superpowers-plugin-<stamp>.zip"
   Remove-Item "$env:USERPROFILE\.claude\plugins\superpowers\*" -Recurse -Force
   Expand-Archive $backup -DestinationPath "$env:USERPROFILE\.claude\plugins\superpowers" -Force
   ```
2. **还原项目级试用**（按第四节写下的清单，只回滚本次改动）：
   ```powershell
   $proj = "D:\path\to\your\project"
   $dst  = Join-Path $proj ".dsh\skills"
   $m    = Get-Content (Join-Path $proj ".dsh\skills-install-manifest.json") -Raw | ConvertFrom-Json
   $backupRoot = Join-Path $proj ".dsh\skills-backup"
   foreach ($n in $m.added)       { Remove-Item (Join-Path $dst $n) -Recurse -Force }
   foreach ($n in $m.overwritten) { Remove-Item (Join-Path $dst $n) -Recurse -Force
                                    Copy-Item (Join-Path $backupRoot $n) (Join-Path $dst $n) -Recurse -Force }
   # 只有当清单为空（目录是本次安装才建的）且目录已空时，才可以删这个目录本身
   if ((Get-ChildItem $dst -Force | Measure-Object).Count -eq 0 -and $m.added.Count -eq 0) { Remove-Item $dst -Force }
   ```
3. **还原源码工作区**：`D:\Deepseek Project\superpowers-adaptive\repo` 是独立 git 仓库（remote 指向你本地的上游克隆，**没有**指向 GitHub）。要彻底丢弃：删除整个 `superpowers-adaptive` 目录即可；上游克隆与已安装环境不受影响。

## 七、升级到上游新版本（将来）

```powershell
cd "D:\Deepseek Project\superpowers-adaptive\repo"
git fetch origin            # origin = 你本地的上游克隆；也可换成 GitHub URL
git diff HEAD..origin/main --stat -- skills/using-superpowers/SKILL.md
```
然后按 `change-note.md` 的文件清单重放改动：入口技能 → 钩子/三个 harness 集成 → 各技能的 `## Flow fit` 与 description → 随附文档与测试断言。

## 八、复跑验证

```bash
cd /path/to/superpowers-adaptive

# 1) 安装/恢复沙箱演练（不碰任何真实安装目录，含「目标不存在」和「已有自定义技能」两种情况）
node verification/install-drill.mjs /path/to/superpowers-6.3.0-adaptive.2.zip

# 2) 静态一致性检查（对仓库根或解包后的插件根）
node verification/static-checks.mjs .

# 3) 判据复核（离线，不调用模型；需要本地已有各臂运行结果）
node verification/setup-scenarios-v2.mjs
node verification/check-scenarios-v2.mjs a3
node verification/retally-tokens.mjs
```

要重跑行为场景需要 `--profile headless` 的 DSH 与凭据；`verification/run-scenario-v2.mjs` 已写明隔离方式
（独立 `DSH_HOME` + 空 `DSH_AGENTS_HOME` + cwd 内 `.dsh/skills`，并用 Git Bash 真实执行 `hooks/session-start` 注入）。
未随仓库发布的本地证据归档里保留了各臂运行现场：`prompt-full.txt` / `out.txt` / `err.txt` / 测试运行留痕
**以及运行工作区 `work/`**（去掉其中的 `.dsh/skills` 与 `.git`），因此判据校验器在离线环境下能真正复算出同样的结论。
检查结论与原始输出见 `evidence/`。

## 九、未验证 / 需要你确认的点

- 候选包**未在 Claude Code 上实测**（本机未安装 Claude Code CLI；行为验证在 DSH headless 隔离环境中完成，见 `verification-report.md`）。
- Claude Code 专属的交互式测试套件未运行；各 harness 的安装脚本未实测（`.codex-plugin` / `.kimi-plugin` / `.devin-plugin` / `.antigravity-plugin`）。
- Graphviz 渲染未验证（本机无 `dot`），dot 流程块只做了结构检查。
- 行为实测为单轮、合成小仓库、单模型（`deepseek-flash`）、每场景一次；**不要据此推断长期或生产效果**。
- 未发布、未提交上游、未改动版本发布流程（`.version-bump.json`、`.github/` 保持原样）。
- 侦察阶段 DSH 自动创建过 `C:\Users\28198\.dsh\profiles\headless\`（仅 profile 骨架，未启用）；不需要时删除该目录即可。
- 工作区里留着 git worktree `D:\Deepseek Project\superpowers-adaptive\base-v6.3.0`（v6.3.0 纯净基线，用于对比）。不再需要时：
  ```powershell
  cd "D:\Deepseek Project\superpowers-adaptive\repo"
  git worktree remove "D:\Deepseek Project\superpowers-adaptive\base-v6.3.0"
  ```
