// 校验生成的技能包：根目录必须有 SKILL.md；包内相对引用必须能在包内解析；内容与仓库一致。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const repo = fs.existsSync(path.join(evalDir, '..', 'skills'))
  ? path.resolve(evalDir, '..')
  : path.resolve(evalDir, '..', 'repo');
const SRC = path.join(repo, 'skills');
const OUT = process.env.SP_SKILL_PKG_OUT || path.resolve(repo, '..', 'dist', 'skill-packages');
const EXTRACT = path.join(os.tmpdir(), 'superpowers-adaptive-skill-package-verify');

const ps = (cmd) => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const results = [];
const check = (id, ok, evidence) => { results.push({ id, pass: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${String(evidence).slice(0, 150)}`); };

fs.rmSync(EXTRACT, { recursive: true, force: true });
const zips = fs.readdirSync(OUT).filter(f => f.endsWith('.zip')).sort();

for (const zip of zips) {
  const dir = path.join(EXTRACT, zip.replace(/\.zip$/, ''));
  fs.mkdirSync(dir, { recursive: true });
  const r = ps(`Expand-Archive -Path ${q(path.join(OUT, zip))} -DestinationPath ${q(dir)} -Force`);
  if (r.status !== 0) { check(`${zip} 可解开`, false, (r.stderr || '').slice(0, 150)); continue; }

  const isBundle = zip.includes('entry-bundle');
  const skillMd = path.join(dir, 'SKILL.md');
  check(`${zip} 根目录含 SKILL.md`, fs.existsSync(skillMd), fs.existsSync(skillMd) ? 'ok' : '根目录没有 SKILL.md');

  // 逐技能包：内容必须与仓库里的同名技能逐字节一致
  if (!isBundle) {
    const name = zip.replace('superpowers-adaptive-', '').replace('-6.3.0-adaptive.2.zip', '');
    const src = path.join(SRC, name);
    let diff = 0, n = 0;
    const walk = (d, base = d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/')); } return out; };
    for (const rel of walk(src)) {
      const b = path.join(dir, rel);
      n++;
      if (!fs.existsSync(b) || crypto.createHash('sha256').update(fs.readFileSync(path.join(src, rel))).digest('hex') !== crypto.createHash('sha256').update(fs.readFileSync(b)).digest('hex')) diff++;
    }
    check(`${zip} 内容与仓库一致`, diff === 0, `${n} 个文件，${diff} 处差异`);
  }

  // 包内相对引用可解析；在仓库里本来也就是断链的（上游遗留）单独归类，不算打包缺陷
  const broken = [], preExisting = [];
  const mdFiles = [];
  (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (e.name.endsWith('.md')) mdFiles.push(p); } })(dir);
  const srcDir = isBundle ? null : path.join(SRC, zip.replace('superpowers-adaptive-', '').replace('-6.3.0-adaptive.2.zip', ''));
  // 仓库里同一链接是否也断（是 → 上游预存断链，与打包无关）。整包：根层文件对应 using-superpowers，其余对应 skills/<x>
  const repoBases = isBundle ? [path.join(SRC, 'using-superpowers'), repo] : [srcDir];
  const brokenInRepo = (rel, link) => repoBases.some(base => {
    const here = path.resolve(base, rel);
    return !fs.existsSync(path.resolve(path.dirname(here), link.replace(/^(\.\.\/)+skills\//, '')));
  });
  for (const f of mdFiles) {
    const rel = path.relative(dir, f).split(path.sep).join('/');
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\]\(([^)#\s]+\.(?:md|json|sh|js|ts|html|txt))\)/g)) {
      if (fs.existsSync(path.resolve(path.dirname(f), m[1]))) continue;
      if (isBundle ? brokenInRepo(rel, m[1]) : !fs.existsSync(path.resolve(path.join(srcDir, rel, '..'), m[1]))) preExisting.push(`${rel} -> ${m[1]}`);
      else broken.push(`${rel} -> ${m[1]}`);
    }
  }
  check(`${zip} 包内引用可解析`, broken.length === 0, broken.length ? broken.slice(0, 3).join('; ') : `${mdFiles.length} 个 md 文件，无打包导致的断链` + (preExisting.length ? `（另有 ${preExisting.length} 处上游预存断链）` : ''));
}

fs.rmSync(EXTRACT, { recursive: true, force: true });
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS（${zips.length} 个包）`);
process.exit(failed.length ? 1 : 0);
