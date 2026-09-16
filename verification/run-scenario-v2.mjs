// 场景跑批 v2（Node 版）：与 run-scenario.mjs 同构，但
//   - 变体名自由（pkgs/<variant>），用于 adaptive.1(a1) vs adaptive.2(a2) 对照
//   - 场景根 = scenarios-v2/，结果 = results-v2/，工作区 = runs-v2/
//   - 额外采集 work/.eval-test-runs.log（测试进程自己写的运行留痕），供判据 test_log 使用
// 隔离手段不变：独立 DSH_HOME + 空 DSH_AGENTS_HOME + cwd 内的 .dsh/skills（不触碰已安装技能）
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const TAG = process.env.SP_EVAL_TAG || 'v2';
const variant = process.argv[2];
if (!variant) {
  console.error('用法: SP_EVAL_TAG=v3 node run-scenario-v2.mjs <a1|a2|a3|...> [all|T01,T02,...] [timeoutSec]');
  process.exit(2);
}
const pkg = path.join(evalDir, 'pkgs', variant);
const onlyArg = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',').map(s => s.trim()).filter(Boolean) : null;
const timeoutSec = Number(process.argv[4] || 900);

const scRoot = path.join(evalDir, `scenarios-${TAG}`);
const resultsDir = path.join(evalDir, `results-${TAG}`);
const runsDir = path.join(evalDir, `runs-${TAG}`, variant);
const dshHome = path.join(evalDir, `home-${TAG}-${variant}`);
const agentsHome = path.join(evalDir, 'agents-home');

const DSH_ENTRY = path.join(process.env.APPDATA, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
if (!fs.existsSync(DSH_ENTRY)) throw new Error(`找不到 dsh 入口: ${DSH_ENTRY}`);
if (!fs.existsSync(path.join(pkg, 'skills'))) throw new Error(`缺少技能包: ${pkg}\\skills`);
if (!fs.existsSync(path.join(scRoot, 'FREEZE.json'))) throw new Error('缺少 scenarios-v2/FREEZE.json —— 先跑 setup-scenarios-v2.mjs');

fs.mkdirSync(resultsDir, { recursive: true });
fs.mkdirSync(runsDir, { recursive: true });
fs.mkdirSync(path.join(agentsHome, 'skills'), { recursive: true });
fs.mkdirSync(dshHome, { recursive: true });
for (const f of ['.credentials.yaml', 'settings.yaml']) {
  const src = path.join(process.env.USERPROFILE, '.dsh', f);
  const dst = path.join(dshHome, f);
  if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
}

// ---- 入口注入（与 v1 完全同构：优先真实执行 hooks/session-start）----
function msys(p) { return '/' + p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (m, d) => d.toLowerCase()); }
function buildInjection() {
  const hook = path.join(pkg, 'hooks', 'session-start');
  const entry = fs.readFileSync(path.join(pkg, 'skills', 'using-superpowers', 'SKILL.md'), 'utf8');
  if (fs.existsSync(hook) && process.env.SP_EVAL_INJECT !== 'simulate') {
    const bashPath = process.env.SP_EVAL_BASH || 'bash';
    const r = spawnSync(bashPath, ['-c', `"${msys(hook)}"`], {
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: pkg }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    const out = (r.stdout || '').trim();
    if (out) {
      try {
        const j = JSON.parse(out);
        const t = j.additionalContext || j.additional_context || (j.hookSpecificOutput && j.hookSpecificOutput.additionalContext);
        if (t) return { text: t, mode: 'hook-executed' };
      } catch { /* fallthrough */ }
    }
  }
  const tpl = fs.existsSync(hook) ? fs.readFileSync(hook, 'utf8') : '';
  const m = tpl.match(/session_context="([\s\S]*?)"\n/);
  let wrapper = m ? m[1]
    .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    .replace(/\$\{using_superpowers_escaped\}/, entry)
    .replace(/\$\{PLUGIN_ROOT\}\/skills\/using-superpowers\/SKILL\.md/, 'skills/using-superpowers/SKILL.md') : null;
  if (!wrapper || wrapper.includes('${')) {
    wrapper = `<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\n**Below is the full content of your 'superpowers:using-superpowers' skill - your introduction to using skills. For all other skills, use the 'Skill' tool:**\n\n${entry}\n</EXTREMELY_IMPORTANT>`;
  }
  return { text: wrapper, mode: 'hook-simulated' };
}
const injection = buildInjection();
console.log(`[${variant}] 注入方式: ${injection.mode}  (${injection.text.length} 字符)`);

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...opts });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

const TEST_LOG = '.eval-test-runs.log';
const ids = (onlyArg || fs.readdirSync(scRoot).filter(d => fs.statSync(path.join(scRoot, d)).isDirectory()).sort());
const summary = [];

for (const id of ids) {
  const sDir = path.join(scRoot, id);
  if (!fs.existsSync(sDir)) { console.log(`跳过（无场景）: ${id}`); continue; }
  const runDir = path.join(runsDir, id);
  fs.rmSync(runDir, { recursive: true, force: true });
  const work = path.join(runDir, 'work');
  fs.mkdirSync(work, { recursive: true });
  fs.cpSync(path.join(sDir, 'work'), work, { recursive: true });
  fs.cpSync(path.join(pkg, 'skills'), path.join(work, '.dsh', 'skills'), { recursive: true });

  sh('git', ['init', '-q'], { cwd: work });
  sh('git', ['config', 'user.email', 'eval@local'], { cwd: work });
  sh('git', ['config', 'user.name', 'eval'], { cwd: work });
  sh('git', ['add', '-A'], { cwd: work });
  sh('git', ['commit', '-qm', 'seed'], { cwd: work });

  const listFiles = () => {
    const acc = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === '.git' || e.name === '.dsh' || e.name === TEST_LOG) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else acc.push(path.relative(work, p).replace(/\\/g, '/'));
      }
    })(work);
    return acc.sort();
  };
  const before = listFiles();

  const task = fs.readFileSync(path.join(sDir, 'prompt.txt'), 'utf8');
  const inject = fs.readFileSync(path.join(sDir, 'inject.txt'), 'utf8').trim() === '1';
  const full = inject ? `${injection.text}\n\n---\n\n${task}` : task;
  fs.writeFileSync(path.join(runDir, 'prompt-full.txt'), full, 'utf8');

  console.log(`== [${variant}/${id}] 运行中… (inject=${inject})`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [DSH_ENTRY, '--profile', 'headless', full], {
    cwd: work, encoding: 'utf8', timeout: timeoutSec * 1000, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, DSH_HOME: dshHome, DSH_AGENTS_HOME: agentsHome },
  });
  if (r.error) console.log(`   [spawn error] ${r.error.code}: ${r.error.message}`);
  const durationSec = Number(((Date.now() - t0) / 1000).toFixed(1));
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  fs.writeFileSync(path.join(runDir, 'out.txt'), r.stdout || '', 'utf8');
  fs.writeFileSync(path.join(runDir, 'err.txt'), r.stderr || '', 'utf8');

  const after = listFiles();
  const added = after.filter(f => !before.includes(f));
  const removed = before.filter(f => !after.includes(f));
  const branch = sh('git', ['branch', '--show-current'], { cwd: work }).out;
  const worktrees = sh('git', ['worktree', 'list'], { cwd: work }).out.split('\n').filter(Boolean);
  const status = sh('git', ['status', '--porcelain'], { cwd: work }).out.split('\n').filter(Boolean);

  // 测试运行留痕：测试进程自己写下的 PASS/FAIL 序列
  const logPath = path.join(work, TEST_LOG);
  const testRunLog = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean)
    : [];

  let metrics = null;
  const cacheDir = path.join(dshHome, 'storages', 'session_projcache', 'sessions');
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir).map(f => ({ f, m: fs.statSync(path.join(cacheDir, f)).mtimeMs })).sort((a, b) => b.m - a.m);
    if (files.length) {
      const j = JSON.parse(fs.readFileSync(path.join(cacheDir, files[0].f), 'utf8'));
      const rows = j.record.rows;
      const tu = rows.tokenUsage?.val?.totals || {};
      metrics = {
        uncached_input_tokens: tu.uncachedInputTokens ?? null,
        cache_read_tokens: tu.cacheReadTokens ?? null,
        cache_write_tokens: tu.cacheWriteTokens ?? null,
        output_tokens: tu.outputTokens ?? null,
        todos_active: rows.todos?.val ? (Array.isArray(rows.todos.val) ? rows.todos.val.length : 1) : 0,
        plan_active: !!rows.plan?.val?.active,
        plan_wanted: !!rows.plan?.val?.wanted,
        subagents: rows.subagent?.val ? Object.keys(rows.subagent.val).length : 0,
        context_surface: rows.contextPressure?.val?.surfaceTokens ?? null,
        session_id: path.basename(files[0].f, '.json'),
      };
    }
  }

  const res = {
    scenario: id, variant, inject_entry: inject, inject_mode: injection.mode,
    duration_sec: durationSec, timed_out: !!timedOut, exit_code: r.status,
    final_message: r.stdout || '', stderr_bytes: (r.stderr || '').length, stderr_tail: (r.stderr || '').slice(-4000),
    files_before: before, files_after: after, files_added: added, files_removed: removed,
    git_branch: branch, git_worktrees: worktrees, git_status: status,
    test_run_log: testRunLog, metrics,
  };
  fs.writeFileSync(path.join(resultsDir, `${variant}-${id}.json`), JSON.stringify(res, null, 2), 'utf8');
  console.log(`   完成 ${durationSec}s exit=${r.status} 新增=[${added.join(', ') || '无'}] subagents=${metrics?.subagents} 测试留痕=${testRunLog.length} 条`);
  summary.push({ id, durationSec, added: added.length, testRuns: testRunLog.length, uncached: metrics?.uncached_input_tokens ?? null, out: metrics?.output_tokens ?? null });
}
console.log(`\n结果目录: ${resultsDir}`);
console.log(JSON.stringify(summary, null, 1));
