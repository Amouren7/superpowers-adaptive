// 汇总对比：判据结果（两臂）+ 盲评结论（A/B 映射回 baseline/candidate）→ eval/results/compare.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(evalDir, 'results');
const judgeDir = path.join(evalDir, 'judge');

const readJson = p => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const base = readJson(path.join(resultsDir, 'verdict-baseline.json'));
const cand = readJson(path.join(resultsDir, 'verdict-candidate.json'));
if (!base || !cand) { console.error('缺少 verdict-baseline.json / verdict-candidate.json'); process.exit(2); }
const mapping = readJson(path.join(judgeDir, 'mapping.json')) || [];
const mapOf = id => mapping.find(m => m.id === id);

const judgeVerdicts = {};
for (const f of fs.existsSync(judgeDir) ? fs.readdirSync(judgeDir) : []) {
  const m = f.match(/^verdict-(S\d+)\.json$/);
  if (m) judgeVerdicts[m[1]] = readJson(path.join(judgeDir, f));
}

const rows = [];
for (const b of base) {
  const c = cand.find(x => x.id === b.id);
  if (!c) continue;
  const j = judgeVerdicts[b.id] || null;
  const mm = mapOf(b.id);
  const winner = !j ? null
    : j.winner === 'tie' ? 'tie'
    : (mm && ((j.winner === 'A') === mm.candidateIsA)) ? 'candidate' : 'baseline';
  rows.push({ id: b.id, title: b.title, level: b.expected_level, b, c, j, winner });
}

const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) ?? 0), 0);
const cnt = (arr, f) => arr.filter(f).length;

const line = [];
line.push('# 两臂对比 — baseline(v6.3.0) vs candidate(6.3.0-adaptive.1)', '');
line.push('> 数据来源：`eval/results/verdict-{baseline,candidate}.json`（判据自动判定）与 `eval/judge/verdict-S*.json`（独立评审子代理盲评，A/B 映射见 `eval/judge/mapping.json`）。');
line.push('> 单轮合成场景、`deepseek-flash`、隔离 DSH headless —— 结论只在这些条件下成立；不据此声称长期或生产效果。', '');

line.push('## 一、判据通过情况（must = 必须满足）', '');
line.push('| 场景 | 期望级别 | baseline must | candidate must | baseline 新增/修改文件 | candidate 新增/修改文件 | baseline 秒 | candidate 秒 | baseline 未缓存/缓存读/输出 | candidate 未缓存/缓存读/输出 |');
line.push('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  const tok = v => `${v.tokens_uncached_input}/${v.tokens_cache_read}/${v.tokens_output}`;
  line.push(`| ${r.id} ${r.title} | ${r.level} | ${r.b.must_pass}/${r.b.must_total} | ${r.c.must_pass}/${r.c.must_total} | ${r.b.files_added.length}/${r.b.files_modified.length} | ${r.c.files_added.length}/${r.c.files_modified.length} | ${r.b.duration_sec} | ${r.c.duration_sec} | ${tok(r.b)} | ${tok(r.c)} |`);
}
line.push('');

const bMustFail = sum(rows, r => r.b.must_total - r.b.must_pass);
const cMustFail = sum(rows, r => r.c.must_total - r.c.must_pass);
const bFiles = sum(rows, r => r.b.files_added.length + r.b.files_modified.length);
const cFiles = sum(rows, r => r.c.files_added.length + r.c.files_modified.length);
const bSec = sum(rows, r => r.b.duration_sec);
const cSec = sum(rows, r => r.c.duration_sec);
const bUncached = sum(rows, r => r.b.tokens_uncached_input ?? 0);
const cUncached = sum(rows, r => r.c.tokens_uncached_input ?? 0);
const bCacheRead = sum(rows, r => r.b.tokens_cache_read ?? 0);
const cCacheRead = sum(rows, r => r.c.tokens_cache_read ?? 0);
const bOut = sum(rows, r => r.b.tokens_output ?? 0);
const cOut = sum(rows, r => r.c.tokens_output ?? 0);

line.push('## 二、合计（同一批场景、同一环境、同一模型）', '');
line.push('| 指标 | baseline | candidate | 差异 |');
line.push('|---|---|---|---|');
line.push(`| must 判据未通过数（越低越好） | ${bMustFail} | ${cMustFail} | ${cMustFail - bMustFail} |`);
line.push(`| 新增+修改文件总数 | ${bFiles} | ${cFiles} | ${cFiles - bFiles} |`);
line.push(`| 总耗时（秒，12 场景） | ${bSec.toFixed(1)} | ${cSec.toFixed(1)} | ${(cSec - bSec).toFixed(1)} |`);
line.push(`| 未缓存输入 token | ${bUncached} | ${cUncached} | ${cUncached - bUncached} |`);
line.push(`| 缓存读取 token | ${bCacheRead} | ${cCacheRead} | ${cCacheRead - bCacheRead} |`);
line.push(`| 输出 token | ${bOut} | ${cOut} | ${cOut - bOut} |`);
line.push('');
line.push(`> 三类 token 分开列出，**不加总、不称"总 token"**：缓存输入与未缓存输入单价不同，相加既不是费用也不是可比工作量。`);
line.push(`> 耗时与 token 是**同环境实测值**，不是估算；但**受单次运行方差影响**（尤其 S07 这类需要反复试错的场景），且每个场景只跑一次，不构成"提效 N%"的结论。`);

line.push('', '## 三、盲评结论（独立评审子代理，A/B 随机、评审不知道哪个是新版）', '');
if (!rows.some(r => r.winner)) {
  line.push('（未找到 `eval/judge/verdict-S*.json`，盲评尚未执行。）');
} else {
  line.push('| 场景 | 更符合"按级别选流程且不牺牲质量底线" | 理由摘要 |');
  line.push('|---|---|---|');
  for (const r of rows) {
    const w = r.winner === 'candidate' ? '**candidate**' : r.winner === 'baseline' ? 'baseline' : r.winner === 'tie' ? 'tie' : '（未评）';
    const reason = (r.j?.reason || '').replace(/\|/g, '\\|').slice(0, 220);
    line.push(`| ${r.id} ${r.title} | ${w} | ${reason} |`);
  }
  const wins = { candidate: cnt(rows, r => r.winner === 'candidate'), baseline: cnt(rows, r => r.winner === 'baseline'), tie: cnt(rows, r => r.winner === 'tie') };
  line.push('', `**盲评计分**：candidate ${wins.candidate} · baseline ${wins.baseline} · tie ${wins.tie}（共 ${rows.length} 场景）`);
  line.push('');
  line.push('### 逐场景评审细节', '');
  for (const r of rows) {
    if (!r.j) continue;
    line.push(`#### ${r.id} ${r.title}`, '');
    line.push(`- A 表现等级：${r.j.level_A ?? 'n/a'} ｜ B 表现等级：${r.j.level_B ?? 'n/a'}`);
    line.push(`- A 问题：${(r.j.problems_A || []).join('；') || '无'}`);
    line.push(`- B 问题：${(r.j.problems_B || []).join('；') || '无'}`);
    if (r.j.must_fail_A?.length) line.push(`- A 未满足的 must 判据：${r.j.must_fail_A.join('；')}`);
    if (r.j.must_fail_B?.length) line.push(`- B 未满足的 must 判据：${r.j.must_fail_B.join('；')}`);
    line.push(`- 结论：${r.winner} ｜ 理由：${r.j.reason || ''} `);
    line.push('');
  }
}

line.push('', '## 四、逐判据明细（自动判定）', '');
for (const r of rows) {
  line.push(`### ${r.id} ${r.title}`, '');
  line.push('| 判据 | 权重 | baseline | candidate |');
  line.push('|---|---|---|---|');
  for (const bc of r.b.criteria) {
    const cc = r.c.criteria.find(x => x.id === bc.id);
    const fmt = x => !x ? '—' : (x.pass === true ? 'PASS' : x.pass === null ? 'UNKNOWN' : 'FAIL');
    line.push(`| ${bc.id} ${bc.desc} | ${bc.weight} | ${fmt(bc)} | ${fmt(cc)} |`);
  }
  line.push('');
}

fs.writeFileSync(path.join(resultsDir, 'compare.md'), line.join('\n'), 'utf8');
console.log('写出 eval/results/compare.md');
console.log(`must 未通过: baseline=${bMustFail} candidate=${cMustFail}；文件改动: ${bFiles} → ${cFiles}；耗时 ${bSec.toFixed(1)}s → ${cSec.toFixed(1)}s；未缓存输入 ${bUncached} → ${cUncached}；缓存读取 ${bCacheRead} → ${cCacheRead}；输出 ${bOut} → ${cOut}`);
