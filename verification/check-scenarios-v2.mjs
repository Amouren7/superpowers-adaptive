// 场景判据校验器 v2：读 results-v2/<variant>-<id>.json × scenarios-v2/<id>/expect.json
// 相对 v1 的两处修正：
//   1) token 口径分开报告（未缓存输入 / 缓存读取 / 缓存写入 / 输出 / 耗时），不再把
//      「未缓存输入 + 输出」标成「总 token」（审查报告第 7 条）。
//   2) 新增判据类型 test_log：以测试运行留痕（测试进程自己写的 PASS/FAIL）为证据，
//      替代「只查最终答复里有没有 test/verify 字样」（审查报告第 4 条）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 证据包里的脚本放在 <root>/scripts/ 下（场景与结果在 <root>/ 下），仓库里脚本与场景是同级 —— 两种布局都要能找到
const evalDir = path.dirname(fileURLToPath(import.meta.url));
const TAG = process.env.SP_EVAL_TAG || 'v2';
const BASE = fs.existsSync(path.join(evalDir, `scenarios-${TAG}`)) ? evalDir
  : fs.existsSync(path.join(evalDir, '..', `scenarios-${TAG}`)) ? path.resolve(evalDir, '..')
  : evalDir;
const variant = process.argv[2];
if (!variant) {
  console.error('用法: SP_EVAL_TAG=v3 node check-scenarios-v2.mjs <a1|a2|a3>');
  process.exit(2);
}
const resultsDir = path.join(BASE, `results-${TAG}`);
const scRoot = path.join(BASE, `scenarios-${TAG}`);
const runsRoot = path.join(BASE, `runs-${TAG}`, variant);
const TEST_LOG = '.eval-test-runs.log';

const SKIP = /^(\.git|\.dsh)\//;

function globToRegex(glob) {
  let s = '';
  for (let i = 0; i < glob.length; i++) {
    if (glob.startsWith('**/', i)) { s += '(?:.*/)?'; i += 2; continue; }
    const ch = glob[i];
    if (ch === '*') s += '[^/]*';
    else if (ch === '?') s += '[^/]';
    else if (ch === '.') s += '\\.';
    else s += ch;
  }
  return new RegExp(`^${s}$`);
}
function listFiles(root, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (SKIP.test(r) || r === TEST_LOG) continue;
    if (e.isDirectory()) out.push(...listFiles(root, r));
    else out.push(r);
  }
  return out.sort();
}
const hash = p => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
function fsDelta(templateDir, workDir) {
  const t = listFiles(templateDir), w = listFiles(workDir);
  return {
    added: w.filter(f => !t.includes(f)),
    removed: t.filter(f => !w.includes(f)),
    modified: t.filter(f => w.includes(f) && hash(path.join(templateDir, f)) !== hash(path.join(workDir, f))),
    all: w,
  };
}

// ---- 冻结清单校验（防止判据在跑完之后被回写）----
const freezePath = path.join(scRoot, 'FREEZE.json');
const freeze = JSON.parse(fs.readFileSync(freezePath, 'utf8'));
const freezeIssues = [];
for (const [id, f] of Object.entries(freeze.scenarios)) {
  for (const rec of f.files) {
    const p = path.join(scRoot, id, rec.file);
    const now = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    if (now !== rec.sha256) freezeIssues.push(`${id}/${rec.file} 与冻结清单不一致`);
  }
}
if (freezeIssues.length) console.log(`[警告] 冻结清单校验不通过：${freezeIssues.join('; ')}\n`);
else console.log(`[ok] 冻结清单校验通过（判据 ${freeze.criteria_version}，冻结于 ${freeze.frozen_at}）\n`);

// test_log 语义
function logVerdict(lines, require) {
  const seq = lines.map(l => (/\sPASS\s/.test(l) ? 'PASS' : /\sFAIL\s/.test(l) ? 'FAIL' : '?')).filter(x => x !== '?');
  const firstFail = seq.indexOf('FAIL');
  const firstPass = seq.indexOf('PASS');
  let pass = null;
  if (require === 'has_pass') pass = seq.includes('PASS');
  else if (require === 'has_fail') pass = seq.includes('FAIL');
  else if (require === 'fail_then_pass') pass = firstFail !== -1 && firstPass > firstFail;
  else pass = null;
  return { pass, evidence: `留痕 ${seq.length} 条 [${seq.join(',') || '空'}]${pass === false && require === 'fail_then_pass' ? '（需要出现 FAIL 且之后有 PASS）' : ''}` };
}

const verdicts = [];
for (const dir of fs.readdirSync(scRoot).sort()) {
  const expectPath = path.join(scRoot, dir, 'expect.json');
  if (!fs.existsSync(expectPath)) continue;
  const expect = JSON.parse(fs.readFileSync(expectPath, 'utf8'));
  const resPath = path.join(resultsDir, `${variant}-${expect.id}.json`);
  if (!fs.existsSync(resPath)) { console.log(`跳过（无结果）: ${expect.id}`); continue; }
  const res = JSON.parse(fs.readFileSync(resPath, 'utf8'));
  const templateDir = path.join(scRoot, expect.id, 'work');
  const workDir = path.join(runsRoot, expect.id, 'work');
  const delta = fs.existsSync(workDir) ? fsDelta(templateDir, workDir) : { added: [], removed: [], modified: [], all: [] };
  const msg = res.final_message || '';
  let lines = res.test_run_log || [];
  if (!lines.length) {
    const lp = path.join(workDir, TEST_LOG);
    if (fs.existsSync(lp)) lines = fs.readFileSync(lp, 'utf8').split(/\r?\n/).filter(Boolean);
  }
  const perCriterion = [];

  const test = (c) => {
    switch (c.type) {
      case 'fs_unchanged':
        return { pass: delta.added.length === 0 && delta.removed.length === 0 && delta.modified.length === 0,
                 evidence: `added=[${delta.added}] modified=[${delta.modified}] removed=[${delta.removed}]` };
      case 'fs_absent': {
        const re = globToRegex(c.glob);
        const hits = delta.all.filter(f => re.test(f));
        return { pass: hits.length === 0, evidence: hits.length ? `命中: ${hits.join(', ')}` : '无命中' };
      }
      case 'fs_present': {
        const re = globToRegex(c.glob);
        const hits = delta.all.filter(f => re.test(f));
        return { pass: hits.length > 0, evidence: hits.length ? `命中: ${hits.slice(0, 6).join(', ')}` : '无命中' };
      }
      case 'fs_added': {
        const re = globToRegex(c.glob);
        const hits = delta.added.filter(f => re.test(f));
        return { pass: hits.length > 0, evidence: hits.length ? `新增命中: ${hits.slice(0, 6).join(', ')}` : '无新增文件命中' };
      }
      case 'fs_touched': {
        const re = globToRegex(c.glob);
        const hits = [...delta.added, ...delta.modified].filter(f => re.test(f));
        return { pass: hits.length > 0, evidence: hits.length ? `新增/修改命中: ${hits.slice(0, 6).join(', ')}` : '未新增或修改任何匹配文件' };
      }
      case 'fs_content': {
        const p = path.join(workDir, c.path);
        if (!fs.existsSync(p)) return { pass: false, evidence: `文件不存在: ${c.path}` };
        const m = fs.readFileSync(p, 'utf8').match(new RegExp(c.pattern, 'm'));
        return { pass: !!m, evidence: m ? `匹配: ${JSON.stringify(m[0]).slice(0, 80)}` : `未匹配 /${c.pattern}/` };
      }
      case 'fs_count_max': {
        const re = globToRegex(c.glob);
        const hits = delta.all.filter(f => re.test(f));
        return { pass: hits.length <= c.max, evidence: `命中 ${hits.length} 个 (max ${c.max}): ${hits.join(', ')}` };
      }
      case 'git_no_worktree': {
        const wt = res.git_worktrees || [];
        const extra = res.git_branch && res.git_branch !== 'master' && res.git_branch !== 'main';
        return { pass: wt.length <= 1 && !extra, evidence: `worktrees=${wt.length} branch=${res.git_branch}` };
      }
      case 'cmd_pass': {
        if (!fs.existsSync(workDir)) return { pass: null, evidence: '工作区不存在' };
        const r = spawnSync(c.cmd, { shell: true, cwd: workDir, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
        const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-6).join(' | ');
        return { pass: r.status === 0, evidence: `exit=${r.status} :: ${tail.slice(0, 400)}` };
      }
      case 'msg_match': {
        const m = msg.match(new RegExp(c.pattern, 'i'));
        return { pass: !!m, evidence: m ? `命中: ${JSON.stringify(m[0])}` : `未命中 /${c.pattern}/i` };
      }
      case 'msg_absent': {
        const m = msg.match(new RegExp(c.pattern, 'i'));
        return { pass: !m, evidence: m ? `不应出现但命中: ${JSON.stringify(m[0])}` : '未出现（ok）' };
      }
      case 'metric_eq': {
        const v = res.metrics ? res.metrics[c.path] : undefined;
        return { pass: v === c.value, evidence: `${c.path}=${JSON.stringify(v)} (期望 ${JSON.stringify(c.value)})` };
      }
      case 'test_log':
        return logVerdict(lines, c.require);
      case 'either': {
        const parts = c.of.map((sub, n) => {
          const cc = typeof sub === 'string' ? expect.criteria.find(x => x.id === sub) : sub;
          return cc ? { id: cc.id || `${c.id}#${n}`, ...test(cc) } : { id: `${c.id}#${n}`, pass: null, evidence: '判据不存在' };
        });
        return { pass: parts.some(p => p.pass === true), evidence: parts.map(p => `${p.id}=${p.pass === true ? 'PASS' : p.pass === null ? 'UNKNOWN' : 'FAIL'}`).join(', ') };
      }
      case 'msg_or_fs': {
        const noPatch = delta.added.length === 0 && delta.modified.length === 0;
        const investigates = !!msg.match(/(复现|证据|日志|根因|假设|定位|观察|investigat|reproduce|root cause|hypothes)/i);
        return { pass: noPatch || investigates, evidence: `未改文件=${noPatch} 调查措辞=${investigates}` };
      }
      default:
        return { pass: null, evidence: `未实现的判据类型: ${c.type}` };
    }
  };

  for (const c of expect.criteria) {
    const r = test(c);
    perCriterion.push({ id: c.id, weight: c.weight, desc: c.desc, pass: r.pass, evidence: r.evidence });
  }
  const must = perCriterion.filter(c => c.weight === 'must');
  const m = res.metrics || {};
  const verdict = {
    id: expect.id, title: expect.title, expected_level: expect.expected_level, variant,
    inject_entry: expect.inject_entry, inject_mode: res.inject_mode,
    duration_sec: res.duration_sec, timed_out: res.timed_out,
    // 分开报告，不再把前两项之和叫「总 token」
    tokens_uncached_input: m.uncached_input_tokens ?? null,
    tokens_cache_read: m.cache_read_tokens ?? null,
    tokens_cache_write: m.cache_write_tokens ?? null,
    tokens_output: m.output_tokens ?? null,
    subagents: m.subagents ?? null,
    todos: m.todos_active ?? null,
    test_runs: lines.length,
    files_added: delta.added, files_modified: delta.modified, files_removed: delta.removed,
    must_pass: must.filter(c => c.pass === true).length, must_total: must.length,
    criteria: perCriterion,
    final_message: msg,
  };
  verdicts.push(verdict);
  const tag = must.every(c => c.pass === true) ? 'PASS' : 'FAIL';
  const tok = `${verdict.tokens_uncached_input}/${verdict.tokens_cache_read}/${verdict.tokens_output}`;
  console.log(`${tag}  ${expect.id}  must ${verdict.must_pass}/${verdict.must_total}  added=${delta.added.length} modified=${delta.modified.length}  ${res.duration_sec}s  tok(uncached/cacheRead/out)=${tok}  subagents=${verdict.subagents}  testRuns=${verdict.test_runs}`);
  for (const c of perCriterion.filter(c => c.pass !== true)) {
    console.log(`      [${c.pass === null ? 'UNKNOWN' : 'FAIL'}] ${c.id} (${c.weight}): ${c.desc} :: ${c.evidence}`);
  }
}
fs.writeFileSync(path.join(resultsDir, `verdict-${variant}.json`), JSON.stringify(verdicts, null, 2), 'utf8');

const sum = (arr, f) => arr.reduce((a, b) => a + (f(b) || 0), 0);
const lines2 = [
  `# 场景判据结果 v2 — ${variant}`, '',
  `判据版本：${freeze.criteria_version}（冻结于 ${freeze.frozen_at}）`, '',
  '| 场景 | 期望级别 | must 通过 | 新增 | 修改 | 耗时 s | 未缓存输入 | 缓存读取 | 输出 | 子代理 | 测试留痕 |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const v of verdicts) {
  lines2.push(`| ${v.id} ${v.title} | ${v.expected_level} | ${v.must_pass}/${v.must_total} | ${v.files_added.length} | ${v.files_modified.length} | ${v.duration_sec} | ${v.tokens_uncached_input} | ${v.tokens_cache_read} | ${v.tokens_output} | ${v.subagents} | ${v.test_runs} |`);
}
lines2.push(
  `| **合计** | | | | | ${sum(verdicts, v => v.duration_sec).toFixed(1)} | ${sum(verdicts, v => v.tokens_uncached_input)} | ${sum(verdicts, v => v.tokens_cache_read)} | ${sum(verdicts, v => v.tokens_output)} | ${sum(verdicts, v => v.subagents)} | ${sum(verdicts, v => v.test_runs)} |`,
  '', '> 三列 token 分开列出：未缓存输入、缓存读取、输出。它们单价不同，相加也不等于费用；本表不做任何「总 token」或费用结论。', '',
  '## 逐判据', '');
for (const v of verdicts) {
  lines2.push(`### ${v.id} ${v.title}`, '');
  for (const c of v.criteria) {
    lines2.push(`- **${c.pass === true ? 'PASS' : c.pass === null ? 'UNKNOWN' : 'FAIL'}** \`${c.id}\` (${c.weight}) ${c.desc} — ${c.evidence}`);
  }
  lines2.push('');
}
fs.writeFileSync(path.join(resultsDir, `summary-${variant}.md`), lines2.join('\n'), 'utf8');
console.log(`\n写出: results-${TAG}/verdict-${variant}.json, results-${TAG}/summary-${variant}.md`);
