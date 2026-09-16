// 场景判据校验器：把 results/<variant>-<id>.json 与 scenarios/<id>/expect.json 对照，
// 产出逐判据 PASS/FAIL/UNKNOWN + 证据。文件增量以「场景模板」为基准自行计算（比 runner 记录更权威）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2];
if (!['baseline', 'candidate'].includes(variant)) {
  console.error('用法: node check-scenarios.mjs <baseline|candidate>');
  process.exit(2);
}
const resultsDir = path.join(evalDir, 'results');
const scRoot = path.join(evalDir, 'scenarios');

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
    if (SKIP.test(r)) continue;
    if (e.isDirectory()) out.push(...listFiles(root, r));
    else out.push(r);
  }
  return out.sort();
}
const hash = p => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);

function fsDelta(templateDir, workDir) {
  const t = listFiles(templateDir), w = listFiles(workDir);
  const added = w.filter(f => !t.includes(f));
  const removed = t.filter(f => !w.includes(f));
  const modified = t.filter(f => w.includes(f) && hash(path.join(templateDir, f)) !== hash(path.join(workDir, f)));
  return { added, removed, modified, all: w };
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
  const workDir = path.join(evalDir, 'runs', variant, expect.id, 'work');
  const delta = fs.existsSync(workDir) ? fsDelta(templateDir, workDir) : { added: [], removed: [], modified: [], all: [] };
  const msg = res.final_message || '';
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
        const txt = fs.readFileSync(p, 'utf8');
        const m = txt.match(new RegExp(c.pattern, 'm'));
        return { pass: !!m, evidence: m ? `匹配: ${JSON.stringify(m[0]).slice(0, 80)}` : `未匹配 /${c.pattern}/` };
      }
      case 'fs_count_max': {
        const re = globToRegex(c.glob);
        const hits = delta.all.filter(f => re.test(f));
        return { pass: hits.length <= c.max, evidence: `命中 ${hits.length} 个 (max ${c.max}): ${hits.join(', ')}` };
      }
      case 'git_no_worktree': {
        const wt = res.git_worktrees || [];
        const branches = (res.git_status || []).filter(l => l.startsWith('##'));
        const extra = res.git_branch && res.git_branch !== 'master' && res.git_branch !== 'main';
        return { pass: wt.length <= 1 && !extra, evidence: `worktrees=${wt.length} branch=${res.git_branch}` };
      }
      case 'cmd_pass': {
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
  const verdict = {
    id: expect.id, title: expect.title, expected_level: expect.expected_level, variant,
    inject_entry: expect.inject_entry, inject_mode: res.inject_mode,
    duration_sec: res.duration_sec, timed_out: res.timed_out,
    // 口径修正（审查报告第 7 条）：分开报告三类输入与输出，不再把「未缓存输入 + 输出」标成「总 token」
    tokens_uncached_input: res.metrics?.uncached_input_tokens ?? null,
    tokens_cache_read: res.metrics?.cache_read_tokens ?? null,
    tokens_cache_write: res.metrics?.cache_write_tokens ?? null,
    tokens_output: res.metrics?.output_tokens ?? null,
    subagents: res.metrics?.subagents ?? null,
    todos: res.metrics?.todos_active ?? null,
    files_added: delta.added, files_modified: delta.modified, files_removed: delta.removed,
    must_pass: must.filter(c => c.pass === true).length, must_total: must.length,
    criteria: perCriterion,
    final_message: msg,
  };
  verdicts.push(verdict);
  const tag = must.every(c => c.pass === true) ? 'PASS' : 'FAIL';
  console.log(`${tag}  ${expect.id}  must ${verdict.must_pass}/${verdict.must_total}  added=${delta.added.length} modified=${delta.modified.length} removed=${delta.removed.length}  ${res.duration_sec}s  tok(uncached/cacheRead/out)=${verdict.tokens_uncached_input}/${verdict.tokens_cache_read}/${verdict.tokens_output}`);
  for (const c of perCriterion.filter(c => c.pass !== true)) {
    console.log(`      [${c.pass === null ? 'UNKNOWN' : 'FAIL'}] ${c.id} (${c.weight}): ${c.desc} :: ${c.evidence}`);
  }
}
fs.writeFileSync(path.join(resultsDir, `verdict-${variant}.json`), JSON.stringify(verdicts, null, 2), 'utf8');

// Markdown 摘要
const sum = (arr, f) => arr.reduce((a, b) => a + (f(b) || 0), 0);
const lines = [`# 场景判据结果 — ${variant}`, '', `| 场景 | 期望级别 | must 通过 | 新增文件 | 修改文件 | 耗时 s | 未缓存输入 | 缓存读取 | 输出 | 子代理 |`, `|---|---|---|---|---|---|---|---|---|---|`];
for (const v of verdicts) {
  lines.push(`| ${v.id} ${v.title} | ${v.expected_level} | ${v.must_pass}/${v.must_total} | ${v.files_added.length} | ${v.files_modified.length} | ${v.duration_sec} | ${v.tokens_uncached_input} | ${v.tokens_cache_read} | ${v.tokens_output} | ${v.subagents} |`);
}
lines.push(
  `| **合计** | | | | | ${sum(verdicts, v => v.duration_sec).toFixed(1)} | ${sum(verdicts, v => v.tokens_uncached_input)} | ${sum(verdicts, v => v.tokens_cache_read)} | ${sum(verdicts, v => v.tokens_output)} | ${sum(verdicts, v => v.subagents)} |`,
  '', '> 三类 token 分开列出：未缓存输入、缓存读取、输出。单价不同，相加也不是费用；本表不作「总 token」或费用结论。', '');
lines.push('', '## 逐判据', '');
for (const v of verdicts) {
  lines.push(`### ${v.id} ${v.title}`, '');
  for (const c of v.criteria) {
    lines.push(`- **${c.pass === true ? 'PASS' : c.pass === null ? 'UNKNOWN' : 'FAIL'}** \`${c.id}\` (${c.weight}) ${c.desc} — ${c.evidence}`);
  }
  lines.push('');
}
fs.writeFileSync(path.join(resultsDir, `summary-${variant}.md`), lines.join('\n'), 'utf8');
console.log(`\n写出: results/verdict-${variant}.json, results/summary-${variant}.md`);
