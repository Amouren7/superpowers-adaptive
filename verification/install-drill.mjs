// 安装 / 恢复沙箱演练（本地、无模型调用）
// 目的：让「安装说明里的路径层级、预检查、可恢复替换、项目级覆盖恢复」变成可执行验证，
//       而不是只写在文档里。全程只动 eval/sandbox-install 下的临时目录，不碰用户真实安装目录。
//
// 用法: node install-drill.mjs [候选包 zip 路径]
// 退出码 0 = 全部 PASS；1 = 有 FAIL（含「旧版错误步骤必须被拦住」的反向回归检查）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(evalDir, 'sandbox-install');
const zip = process.argv[2] || path.join(evalDir, '..', 'dist', 'superpowers-6.3.0-adaptive.2.zip');
const BASH = process.env.SP_EVAL_BASH || (fs.existsSync('D:\\CC\\Git\\bin\\bash.exe') ? 'D:\\CC\\Git\\bin\\bash.exe' : 'bash');

const results = [];
function check(id, ok, evidence) {
  results.push({ id, pass: !!ok, evidence: String(evidence).slice(0, 400) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${String(evidence).slice(0, 200)}`);
}

const ps = (cmd) => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  const r = ps(`Copy-Item -Path ${q(path.join(src, '*'))} -Destination ${q(dst)} -Recurse -Force`);
  if (r.status !== 0) throw new Error(`Copy-Item 失败: ${(r.stderr || '').slice(0, 300)}`);
}
function removeTreeContents(dst) {
  if (!fs.existsSync(dst)) return;
  const r = ps(`Get-ChildItem -Path ${q(dst)} -Force | Remove-Item -Recurse -Force`);
  if (r.status !== 0) throw new Error(`Remove-Item 失败: ${(r.stderr || '').slice(0, 300)}`);
}
function zipDir(srcDir, zipPath) {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  const r = ps(`Compress-Archive -Path ${q(path.join(srcDir, '*'))} -DestinationPath ${q(zipPath)} -Force`);
  if (r.status !== 0) throw new Error(`Compress-Archive 失败: ${(r.stderr || '').slice(0, 300)}`);
}
function unzipTo(zipPath, dst) {
  fs.mkdirSync(dst, { recursive: true });
  const r = ps(`Expand-Archive -Path ${q(zipPath)} -DestinationPath ${q(dst)} -Force`);
  if (r.status !== 0) throw new Error(`Expand-Archive 失败: ${(r.stderr || '').slice(0, 300)}`);
}

// ---------- 预检查：源目录必须是「真正的插件根」 ----------
function precheck(src) {
  const problems = [];
  if (!fs.existsSync(path.join(src, '.claude-plugin', 'plugin.json'))) problems.push('缺少 .claude-plugin/plugin.json');
  if (!fs.existsSync(path.join(src, 'skills'))) problems.push('缺少 skills/');
  if (!fs.existsSync(path.join(src, 'hooks', 'session-start'))) problems.push('缺少 hooks/session-start');
  const skillDirs = fs.existsSync(path.join(src, 'skills')) ? fs.readdirSync(path.join(src, 'skills')).filter(d => fs.existsSync(path.join(src, 'skills', d, 'SKILL.md'))) : [];
  if (skillDirs.length < 10) problems.push(`skills/ 下只找到 ${skillDirs.length} 个带 SKILL.md 的技能目录`);
  return { ok: problems.length === 0, problems, skillDirs: skillDirs.length };
}
function locatePluginRoot(unpackedDir) {
  const hits = fs.readdirSync(unpackedDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(unpackedDir, e.name, '.claude-plugin', 'plugin.json')))
    .map(e => path.join(unpackedDir, e.name));
  return hits;
}
function hashTree(dir) {
  const out = {};
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, r);
      else out[r] = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
    }
  })(dir, '');
  return out;
}
const hookWorks = (pluginRoot) => {
  const msysPath = pluginRoot.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (m, d) => '/' + d.toLowerCase());
  const r = spawnSync(BASH, ['-c', `CLAUDE_PLUGIN_ROOT=${JSON.stringify(pluginRoot).replace(/\\/g, '/')} "${msysPath}/hooks/session-start"`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  // JSON.stringify 给出双引号包裹的赋值，路径里的空格/反斜杠都不会被拆开
  const out = (r.stdout || '').trim();
  const marker = out.includes('<SUPERPOWERS>');
  return { ok: marker, evidence: `exit=${r.status} 输出含 <SUPERPOWERS>=${marker} 长度=${out.length}` };
};

// ---------- 文档化的安装步骤（可恢复替换） ----------
function installPlugin({ src, dst, backupZip }) {
  const pre = precheck(src);
  if (!pre.ok) return { ok: false, stage: 'precheck-src', detail: pre.problems.join('; ') };
  const hadTarget = fs.existsSync(dst) && fs.readdirSync(dst).length > 0;
  if (hadTarget) {
    zipDir(dst, backupZip);
    if (!fs.existsSync(backupZip)) return { ok: false, stage: 'backup', detail: '备份未生成' };
    // 备份可校验：能重新解开且含插件清单
    const verifyDir = path.join(root, 'backup-verify');
    fs.rmSync(verifyDir, { recursive: true, force: true });
    unzipTo(backupZip, verifyDir);
    if (!fs.existsSync(path.join(verifyDir, '.claude-plugin', 'plugin.json'))) return { ok: false, stage: 'backup-verify', detail: '备份无法还原出插件清单' };
    fs.rmSync(verifyDir, { recursive: true, force: true });
  }
  // 先在暂存目录验证新版本，再替换
  const stage = path.join(root, 'stage');
  fs.rmSync(stage, { recursive: true, force: true });
  copyTree(src, stage);
  const stageCheck = precheck(stage);
  if (!stageCheck.ok) return { ok: false, stage: 'stage-verify', detail: stageCheck.problems.join('; ') };
  removeTreeContents(dst);
  copyTree(stage, dst);
  const post = precheck(dst);
  if (!post.ok) return { ok: false, stage: 'postcheck', detail: post.problems.join('; ') };
  const hook = hookWorks(dst);
  if (!hook.ok) return { ok: false, stage: 'hook', detail: hook.evidence };
  return { ok: true, stage: 'done', hadTarget, detail: hook.evidence };
}

// ---------- 项目级安装（记录新增/覆盖，可原样恢复） ----------
function installProjectSkills({ srcSkills, projectRoot, manifestPath }) {
  const dst = path.join(projectRoot, '.dsh', 'skills');
  fs.mkdirSync(dst, { recursive: true });
  const backupDir = path.join(root, 'project-backup');
  const manifest = { created_at: new Date().toISOString(), added: [], overwritten: [] };
  for (const name of fs.readdirSync(srcSkills)) {
    const from = path.join(srcSkills, name);
    const to = path.join(dst, name);
    if (fs.existsSync(to)) {
      const b = path.join(backupDir, name);
      fs.mkdirSync(path.dirname(b), { recursive: true });
      copyTree(to, b);
      manifest.overwritten.push(name);
    } else {
      manifest.added.push(name);
    }
    copyTree(from, to);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}
function restoreProjectSkills({ projectRoot, manifestPath }) {
  const dst = path.join(projectRoot, '.dsh', 'skills');
  const backupDir = path.join(root, 'project-backup');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const name of manifest.added) fs.rmSync(path.join(dst, name), { recursive: true, force: true });
  for (const name of manifest.overwritten) {
    fs.rmSync(path.join(dst, name), { recursive: true, force: true });
    copyTree(path.join(backupDir, name), path.join(dst, name));
  }
  return manifest;
}

// ---------- 开始演练 ----------
console.log(`沙箱: ${root}`);
if (!fs.existsSync(zip)) { console.error(`找不到候选包: ${zip}`); process.exit(2); }
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });

// 1) 解包 + 定位真正的插件根
const unpacked = path.join(root, 'unpacked');
unzipTo(zip, unpacked);
const roots = locatePluginRoot(unpacked);
check('locate-plugin-root', roots.length === 1, `找到 ${roots.length} 个插件根: ${roots.map(r => path.relative(unpacked, r)).join(', ')}`);
if (roots.length !== 1) { console.error('无法唯一定位插件根，演练中止'); process.exit(1); }
const pluginRoot = roots[0];
const relRoot = path.relative(unpacked, pluginRoot).replace(/\\/g, '/');
check('zip-has-top-level-dir', relRoot !== '' && relRoot !== '.', `解压后真正的插件根 = unpacked/${relRoot}（安装说明的 $src 必须指向它，而不是 unpacked）`);

const pre = precheck(pluginRoot);
check('precheck-plugin-root', pre.ok, pre.ok ? `${pre.skillDirs} 个技能目录 + plugin.json + hooks/session-start 齐备` : pre.problems.join('; '));

// 2) 反向回归：旧说明里 $src=unpacked 的写法必须被预检查拦住
const oldWay = precheck(unpacked);
check('old-src-is-rejected', !oldWay.ok, `旧写法（$src=unpacked）预检查结果: ${oldWay.ok ? '通过（说明预检查无效！）' : '被拦下 -> ' + oldWay.problems.join('; ')}`);

// 3) Case A：目标不存在
const dstA = path.join(root, 'caseA', 'plugins', 'superpowers');
const a = installPlugin({ src: pluginRoot, dst: dstA, backupZip: path.join(root, 'caseA-backup.zip') });
check('caseA-target-absent', a.ok, a.ok ? `安装完成，${a.detail}` : `失败于 ${a.stage}: ${a.detail}`);
check('caseA-no-backup-needed', a.ok && a.hadTarget === false, `目标原本不存在 -> 不需要备份（hadTarget=${a.hadTarget}）`);
const aHash = hashTree(path.join(dstA, 'skills'));
const srcHash = hashTree(path.join(pluginRoot, 'skills'));
check('caseA-skills-identical', JSON.stringify(aHash) === JSON.stringify(srcHash), `skills/ 与包内逐文件一致（${Object.keys(aHash).length} 个文件）`);

// 4) 覆盖已有安装：备份 → 替换 → 恢复后逐字节一致
const dstB = path.join(root, 'caseB', 'plugins', 'superpowers');
fs.mkdirSync(path.join(dstB, '.claude-plugin'), { recursive: true });
fs.writeFileSync(path.join(dstB, '.claude-plugin', 'plugin.json'), '{"name":"superpowers","version":"6.2.0-LOCAL-EDITED"}\n');
fs.writeFileSync(path.join(dstB, 'LOCAL-NOTE.txt'), 'user local edit\n');
fs.mkdirSync(path.join(dstB, 'skills'), { recursive: true });
fs.writeFileSync(path.join(dstB, 'skills', 'LOCAL-SKILL.md'), '# locally installed extra skill\n');
const beforeB = hashTree(dstB);
const b = installPlugin({ src: pluginRoot, dst: dstB, backupZip: path.join(root, 'caseB-backup.zip') });
check('caseB-replace-existing', b.ok, b.ok ? `替换完成，${b.detail}` : `失败于 ${b.stage}: ${b.detail}`);
check('caseB-backup-verified', fs.existsSync(path.join(root, 'caseB-backup.zip')), '替换前生成了备份 zip');
removeTreeContents(dstB);
unzipTo(path.join(root, 'caseB-backup.zip'), dstB);
const afterB = hashTree(dstB);
check('caseB-restore-byte-identical', JSON.stringify(beforeB) === JSON.stringify(afterB), `恢复后与替换前逐文件一致（${Object.keys(beforeB).length} 个文件）`);

// 5) Case C：项目级目录已存在用户自定义技能 + 同名被覆盖的技能
const proj = path.join(root, 'caseC', 'project');
fs.mkdirSync(path.join(proj, '.dsh', 'skills', 'my-custom-skill'), { recursive: true });
fs.writeFileSync(path.join(proj, '.dsh', 'skills', 'my-custom-skill', 'SKILL.md'), '# my custom skill\nlocal only\n');
fs.mkdirSync(path.join(proj, '.dsh', 'skills', 'brainstorming'), { recursive: true });
fs.writeFileSync(path.join(proj, '.dsh', 'skills', 'brainstorming', 'SKILL.md'), '# my locally edited brainstorming\n');
const beforeC = hashTree(path.join(proj, '.dsh', 'skills'));
const manifestPath = path.join(root, 'caseC-manifest.json');
const manifest = installProjectSkills({ srcSkills: path.join(pluginRoot, 'skills'), projectRoot: proj, manifestPath });
check('caseC-custom-skill-survives', fs.readFileSync(path.join(proj, '.dsh', 'skills', 'my-custom-skill', 'SKILL.md'), 'utf8').includes('local only'), '已有自定义技能未被删除');
check('caseC-manifest-recorded', manifest.added.length > 0 && manifest.overwritten.includes('brainstorming'), `新增 ${manifest.added.length} 个 / 覆盖 ${manifest.overwritten.join(',')}`);

// 6) 恢复：不能删整个目录，只按清单回滚
restoreProjectSkills({ projectRoot: proj, manifestPath });
const afterC = hashTree(path.join(proj, '.dsh', 'skills'));
check('caseC-restore-byte-identical', JSON.stringify(beforeC) === JSON.stringify(afterC), `按清单恢复后与安装前逐文件一致（${Object.keys(beforeC).length} 个文件）`);
check('caseC-no-whole-dir-delete', fs.existsSync(path.join(proj, '.dsh', 'skills')), '恢复过程保留了目录本身，未整目录删除');

const failed = results.filter(r => !r.pass);
fs.writeFileSync(path.join(root, 'drill-report.json'), JSON.stringify({ zip, plugin_root_in_zip: repoRel(pluginRoot, unpacked), results, failed: failed.length }, null, 2), 'utf8');
function repoRel(p, base) { return path.relative(base, p).replace(/\\/g, '/'); }
console.log(`\n演练结果: ${results.length - failed.length}/${results.length} PASS，报告: ${path.join(root, 'drill-report.json')}`);
process.exit(failed.length ? 1 : 0);
