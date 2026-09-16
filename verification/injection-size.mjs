// 测量入口注入体积：真实执行 pkg/hooks/session-start，打印注入到会话上下文的字符数/字节数。
// 用法: node injection-size.mjs [pkg 目录 ...]   （默认 eval/pkgs/a1 eval/pkgs/a2）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const pkgs = process.argv.slice(2).length ? process.argv.slice(2) : [path.join(evalDir, 'pkgs', 'a1'), path.join(evalDir, 'pkgs', 'a2')];
const BASH = process.env.SP_EVAL_BASH || (fs.existsSync('D:\\CC\\Git\\bin\\bash.exe') ? 'D:\\CC\\Git\\bin\\bash.exe' : 'bash');

function msys(p) { return '/' + p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (m, d) => d.toLowerCase()); }
const rows = [];
for (const pkg of pkgs) {
  const hook = path.join(pkg, 'hooks', 'session-start');
  const entryFile = path.join(pkg, 'skills', 'using-superpowers', 'SKILL.md');
  if (!fs.existsSync(hook)) { console.log(`跳过（无钩子）: ${pkg}`); continue; }
  const r = spawnSync(BASH, ['-c', `"${msys(hook)}"`], { env: { ...process.env, CLAUDE_PLUGIN_ROOT: pkg }, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  let text = '';
  try {
    const j = JSON.parse((r.stdout || '').trim());
    text = j.hookSpecificOutput?.additionalContext || j.additionalContext || j.additional_context || '';
  } catch (e) { console.log(`解析钩子输出失败: ${pkg} :: ${(r.stderr || '').slice(0, 200)}`); continue; }
  const entry = fs.readFileSync(entryFile, 'utf8');
  rows.push({
    pkg: path.basename(pkg),
    entry_chars: entry.length,
    entry_bytes: Buffer.byteLength(entry, 'utf8'),
    injected_chars: text.length,
    injected_sha256_12: crypto.createHash('sha256').update(text).digest('hex').slice(0, 12),
    skills_net_lines: null,
  });
}
for (const row of rows) {
  console.log(`${row.pkg}: 入口技能 ${row.entry_chars} 字符 / 注入整体 ${row.injected_chars} 字符 / sha256:${row.injected_sha256_12}`);
}
const outDir = path.join(evalDir, 'results-v2');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'injection-size.json'), JSON.stringify(rows, null, 2), 'utf8');
