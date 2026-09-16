// 口径修正复算（审查报告第 7 条）：直接从 eval/results/ 的原始 metrics 重算两臂 token 分解，
// 不改动任何原始结果文件，也不改写 adaptive.1 已发布的成绩。
// 用法: node retally-tokens.mjs [结果目录，默认 eval/results]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = process.argv[2] || path.join(evalDir, 'results');

const arms = ['baseline', 'candidate', 'candidate-hook'];
const rows = [];
const totals = {};
for (const f of fs.readdirSync(resultsDir)) {
  const m = f.match(/^([a-z-]+)-(S\d+)\.json$/);
  if (!m) continue;
  const [, arm, id] = m;
  if (!arms.includes(arm)) continue;
  const j = JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
  const x = j.metrics || {};
  rows.push({
    arm, id, duration: j.duration_sec,
    uncached: x.uncached_input_tokens ?? 0,
    cacheRead: x.cache_read_tokens ?? 0,
    cacheWrite: x.cache_write_tokens ?? 0,
    out: x.output_tokens ?? 0,
    subagents: x.subagents ?? 0,
  });
  totals[arm] = totals[arm] || { n: 0, duration: 0, uncached: 0, cacheRead: 0, cacheWrite: 0, out: 0 };
  const t = totals[arm];
  t.n++; t.duration += j.duration_sec || 0; t.uncached += x.uncached_input_tokens || 0;
  t.cacheRead += x.cache_read_tokens || 0; t.cacheWrite += x.cache_write_tokens || 0; t.out += x.output_tokens || 0;
}

const lines = [
  '# token / 耗时口径复算（原始 metrics，未改任何结果文件）', '',
  '> 修正说明：adaptive.1 报告里的「总 token」实际是「未缓存输入 + 输出」，漏掉了缓存读取。下表按原始记录分开列出。',
  '> 缓存读取与未缓存输入单价不同，相加既不是费用也不是可比工作量；本表不作求和结论。', '',
  '| 臂 | 场景数 | 耗时 s | 未缓存输入 | 缓存读取 | 缓存写入 | 输出 |',
  '|---|---|---|---|---|---|---|',
];
for (const arm of arms) {
  const t = totals[arm];
  if (!t) continue;
  lines.push(`| ${arm} | ${t.n} | ${t.duration.toFixed(1)} | ${t.uncached} | ${t.cacheRead} | ${t.cacheWrite} | ${t.out} |`);
}
lines.push('', '## 逐场景', '', '| 臂 | 场景 | 耗时 s | 未缓存输入 | 缓存读取 | 输出 |', '|---|---|---|---|---|---|');
for (const r of rows.sort((a, b) => a.arm.localeCompare(b.arm) || a.id.localeCompare(b.id))) {
  lines.push(`| ${r.arm} | ${r.id} | ${r.duration} | ${r.uncached} | ${r.cacheRead} | ${r.out} |`);
}
const outPath = path.join(resultsDir, 'token-retally.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(lines.slice(0, 12).join('\n'));
console.log(`\n写出: ${outPath}`);
