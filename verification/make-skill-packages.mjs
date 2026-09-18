// 把 14 个技能分别打成「技能包」：每个 zip 的根目录直接就是该技能（SKILL.md 在根），
// 供「Skill 包根目录必须包含 SKILL.md」这类校验使用。另外打一个入口包（根=using-superpowers，
// 其余技能放在 skills/ 下）供只认单包的目标平台使用。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
// 仓库布局：<repo>/verification/*.mjs；维护者布局：<work>/eval/*.mjs + <work>/repo
const repo = fs.existsSync(path.join(evalDir, '..', 'skills'))
  ? path.resolve(evalDir, '..')
  : path.resolve(evalDir, '..', 'repo');
const SRC = path.join(repo, 'skills');
const VERSION = '6.3.0-adaptive.2';
const OUT = process.env.SP_SKILL_PKG_OUT || path.resolve(repo, '..', 'dist', 'skill-packages');
const STAGE = path.join(os.tmpdir(), 'superpowers-adaptive-skill-package-stage');

fs.rmSync(STAGE, { recursive: true, force: true });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const ps = (cmd) => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const skills = fs.readdirSync(SRC, { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(SRC, e.name, 'SKILL.md')))
  .map(e => e.name).sort();

const built = [];
for (const name of skills) {
  const stage = path.join(STAGE, name);
  fs.mkdirSync(stage, { recursive: true });
  // 技能目录内容复制到包根
  const r = ps(`Copy-Item -Path ${q(path.join(SRC, name, '*'))} -Destination ${q(stage)} -Recurse -Force`);
  if (r.status !== 0) { console.error(`复制失败 ${name}: ${(r.stderr || '').slice(0, 200)}`); process.exit(1); }
  const zip = path.join(OUT, `superpowers-adaptive-${name}-${VERSION}.zip`);
  const z = ps(`Compress-Archive -Path ${q(path.join(stage, '*'))} -DestinationPath ${q(zip)} -Force`);
  if (z.status !== 0) { console.error(`打包失败 ${name}: ${(z.stderr || '').slice(0, 200)}`); process.exit(1); }
  built.push({ name, zip, files: countFiles(stage) });
}
fs.rmSync(STAGE, { recursive: true, force: true });

// 入口包：根 = using-superpowers（含 references/），其余技能在 skills/ 下
const entryStage = path.join(evalDir, 'skill-package-stage-entry');
fs.rmSync(entryStage, { recursive: true, force: true });
fs.mkdirSync(entryStage, { recursive: true });
ps(`Copy-Item -Path ${q(path.join(SRC, 'using-superpowers', '*'))} -Destination ${q(entryStage)} -Recurse -Force`);
for (const name of skills) {
  if (name === 'using-superpowers') continue;
  const to = path.join(entryStage, 'skills', name);
  fs.mkdirSync(to, { recursive: true });
  ps(`Copy-Item -Path ${q(path.join(SRC, name, '*'))} -Destination ${q(to)} -Recurse -Force`);
}
const entryZip = path.join(OUT, `superpowers-adaptive-entry-bundle-${VERSION}.zip`);
ps(`Compress-Archive -Path ${q(path.join(entryStage, '*'))} -DestinationPath ${q(entryZip)} -Force`);
fs.rmSync(entryStage, { recursive: true, force: true });

function countFiles(dir) {
  let n = 0;
  (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) w(p); else n++; } })(dir);
  return n;
}

console.log(`每个技能一个包（根目录即 SKILL.md）：${built.length} 个`);
for (const b of built) console.log(`  ${path.basename(b.zip)}  (${b.files} 个文件)`);
console.log(`入口整包（根=using-superpowers，其余在 skills/ 下）：${path.basename(entryZip)}`);
console.log(`输出目录: ${OUT}`);
