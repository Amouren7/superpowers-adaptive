/**
 * dsh-superpowers-adaptive
 *
 * 把 Superpowers Adaptive 的入口技能（A/B/C/D 分级）注入每个 DSH 会话。
 *
 * 为什么不是 hook：DSH 自带的 @deepseek-ai/dsh-hooks-claude-code 桥接能执行
 * SessionStart / UserPromptSubmit 命令（实测留痕可证），但本机 DSH 0.1.5-rc.1
 * 运行时下 hook 的 additionalContext 没有进到模型上下文（SessionStart 还是
 * detached 运行，按文档本就会错过首个请求）。这里改用 system-prompt 服务的
 * 持久 prompt context —— 每次装配时求值、以 user 角色快照进入历史，从第一轮
 * 就在，且不依赖 shell 与外部进程。
 *
 * 入口文本在执行时从已安装的 Superpowers 插件目录读取（默认
 * ~/.claude/plugins/superpowers），因此包不复制正文、两边不会漂移；
 * 用 SUPERPOWERS_PLUGIN_ROOT 环境变量可指向别处。
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = '@dsh-external/dsh-superpowers-adaptive'

/** 需要 system-prompt 服务（由 @deepseek-ai/dsh-system-prompt 提供，dsh-base 已含）。 */
export const inject = ['systemPrompt']

const PLUGIN_ROOT = process.env.SUPERPOWERS_PLUGIN_ROOT
  || path.join(os.homedir(), '.claude', 'plugins', 'superpowers')
const ENTRY_REL = 'skills/using-superpowers/SKILL.md'
const CONTEXT_NAME = 'superpowers:adaptive-entry'
const CONTEXT_ORDER = 200

const PREAMBLE = `<SUPERPOWERS>
Skills are tools you load when they help, not a gate you pass before replying.
Classify the task first - A direct, B lightweight fix, C standard development, D full process - then load only the skills that level needs.

The using-superpowers entry is included below and is ALREADY LOADED for this session: do not load it again. For every other skill, use the skill tool.
</SUPERPOWERS>`

function readEntry() {
  const file = path.join(PLUGIN_ROOT, ENTRY_REL)
  try {
    const text = fs.readFileSync(file, 'utf8').trim()
    if (text.length === 0) return { ok: false, file, reason: 'entry file is empty' }
    return { ok: true, file, text: `${PREAMBLE}\n\n${text}\n` }
  } catch (error) {
    return { ok: false, file, reason: error && error.message ? error.message : String(error) }
  }
}

export function apply(ctx) {
  const first = readEntry()
  if (!first.ok) {
    ctx.logger?.warn(`superpowers-adaptive: entry not injected - ${first.reason} (${first.file})`)
    return
  }

  ctx.effect(() => ctx.systemPrompt.context({
    name: CONTEXT_NAME,
    order: CONTEXT_ORDER,
    // 每次装配重新读取：编辑已安装的入口技能后，新会话立即生效，不需要重载插件
    text: () => {
      const now = readEntry()
      return now.ok ? now.text : ''
    },
  }), 'superpowers-adaptive: entry prompt context')

  ctx.logger?.info?.(`superpowers-adaptive: injecting ${first.text.length} chars from ${first.file}`)
}
