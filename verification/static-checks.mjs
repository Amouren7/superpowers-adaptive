// 静态一致性检查：frontmatter、过期强制措辞、交叉引用、Flow fit、入口注入一致性、清单与语法
// 用法: node static-checks.mjs <包根目录>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));

const pkg = process.argv[2];
if (!pkg || !fs.existsSync(pkg)) { console.error('用法: node static-checks.mjs <pkgDir>'); process.exit(2); }

const results = [];
const add = (group, name, pass, evidence = '') => results.push({ group, name, pass, evidence });

function walk(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}
const rel = p => path.relative(pkg, p).replace(/\\/g, '/');

// 历史文件豁免（历史记录不是"正在注入的要求"）
const HISTORICAL = /(^RELEASE-NOTES\.md$|^docs\/superpowers\/(plans|specs)\/|^docs\/plans\/|^docs\/windows\/|\.github\/|^CHANGELOG)/;

// 把 fenced code block 内容抹掉：示例里出现的旧措辞是在"示范如何写规则"，不是在要求 agent
function stripCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, '\n[code]\n').replace(/~~~[\s\S]*?~~~/g, '\n[code]\n');
}
// 断言"不得包含"的测试文件会把旧措辞当作 forbidden 字面量，不算残留
const STALE_SCAN_SKIP = /^tests\/hooks\/test-session-start\.sh$/;

// ---------- 1. frontmatter 与结构 ----------
const skillFiles = walk(path.join(pkg, 'skills'), p => p.endsWith('SKILL.md'));
add('structure', 'skills/*/SKILL.md 数量', skillFiles.length >= 14, `${skillFiles.length} 个`);
for (const f of skillFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  const m = txt.match(/^---\n([\s\S]*?)\n---\n/);
  const dir = path.basename(path.dirname(f));
  if (!m) { add('frontmatter', `${dir} 有 frontmatter`, false, '缺失'); continue; }
  const fm = m[1];
  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1];
  const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1];
  const fields = [...fm.matchAll(/^([a-zA-Z_-]+):/gm)].map(x => x[1]);
  add('frontmatter', `${dir} name==目录名`, name === dir, `name=${name}`);
  add('frontmatter', `${dir} description 单行且非空`, !!desc && desc.trim().length > 10, `len=${(desc || '').trim().length}`);
  add('frontmatter', `${dir} 仅 name/description 字段`, fields.every(x => ['name', 'description'].includes(x)), `fields=${fields.join(',')}`);
}

// ---------- 2. 过期强制措辞 ----------
const stale = [
  '1% chance', 'before ANY response', 'ABSOLUTELY MUST', 'EXTREMELY_IMPORTANT',
  'You have superpowers', 'Violating the letter', 'NO SKILL WITHOUT A FAILING TEST FIRST',
  'This applies to EVERY task', 'Before entering plan mode', 'No exceptions without your human partner',
];
const mdFiles = walk(pkg, p => /\.(md|sh|js|ts|py|json|cmd)$/.test(p) && !rel(p).startsWith('.git/'));
for (const pat of stale) {
  const hits = mdFiles.filter(f => {
    const r = rel(f);
    if (HISTORICAL.test(r) || STALE_SCAN_SKIP.test(r)) return false;
    const txt = /\.(md)$/.test(r) ? stripCodeBlocks(fs.readFileSync(f, 'utf8')) : fs.readFileSync(f, 'utf8');
    return txt.includes(pat);
  });
  add('stale-phrases', `无「${pat}」`, hits.length === 0, hits.length ? hits.map(rel).join(', ') : 'clean');
}

// ---------- 3. Flow fit 与分级词汇 ----------
const edited = ['using-superpowers', 'brainstorming', 'writing-plans', 'executing-plans', 'systematic-debugging',
  'test-driven-development', 'verification-before-completion', 'requesting-code-review', 'receiving-code-review',
  'finishing-a-development-branch', 'using-git-worktrees', 'dispatching-parallel-agents',
  'subagent-driven-development', 'writing-skills'];
for (const s of edited) {
  const f = path.join(pkg, 'skills', s, 'SKILL.md');
  const txt = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const has = txt.includes('## Flow fit');
  const four = ['Levels', 'Lightweight path', 'Skip when', 'Non-negotiables'].filter(k => txt.includes(k));
  if (s === 'using-superpowers') {
    const okLevels = ['**A — Direct**', '**B — Lightweight fix**', '**C — Standard**', '**D — Full**'].every(k => txt.includes(k));
    add('flow-fit', `using-superpowers 含 A/B/C/D 四级定义`, okLevels, okLevels ? 'ok' : '缺级别行');
    const okInvariants = txt.includes('What never changes with the level');
    add('flow-fit', `using-superpowers 含全等级不变量`, okInvariants, okInvariants ? 'ok' : '缺');
    const noMandate = !txt.includes('must invoke') && !txt.includes('1%');
    add('flow-fit', `using-superpowers 无强制调用残留`, noMandate, noMandate ? 'ok' : '仍有强制措辞');
  } else {
    add('flow-fit', `${s} 有 Flow fit 小节`, has, has ? 'ok' : '缺失');
    add('flow-fit', `${s} Flow fit 四项齐全`, four.length === 4, `含 ${four.join('/')}`);
  }
}

// ---------- 4. 交叉引用可解析 ----------
let broken = 0, checked = 0;
for (const f of mdFiles.filter(x => x.endsWith('.md'))) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/\]\(([^)]+)\)/g)) {
    let target = m[1].trim().split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    checked++;
    if (!fs.existsSync(path.resolve(path.dirname(f), target))) { broken++; add('cross-refs', `链接可解析: ${rel(f)} -> ${target}`, false, '缺失'); }
  }
}
add('cross-refs', `所有相对链接可解析（共 ${checked} 个）`, broken === 0, broken ? `${broken} 个断链` : 'ok');

// ---------- 5. 入口注入一致性 ----------
const entries = {
  'hooks/session-start': path.join(pkg, 'hooks', 'session-start'),
  '.opencode/plugins/superpowers.js': path.join(pkg, '.opencode', 'plugins', 'superpowers.js'),
  '.pi/extensions/superpowers.ts': path.join(pkg, '.pi', 'extensions', 'superpowers.ts'),
  '.hermes-plugin/__init__.py': path.join(pkg, '.hermes-plugin', '__init__.py'),
};
for (const [name, f] of Object.entries(entries)) {
  if (!fs.existsSync(f)) { add('entry-consistency', `${name} 存在`, false, '文件缺失'); continue; }
  const txt = fs.readFileSync(f, 'utf8');
  add('entry-consistency', `${name} 使用 <SUPERPOWERS> 包装`, txt.includes('<SUPERPOWERS>'), txt.includes('<SUPERPOWERS>') ? 'ok' : '未找到');
  add('entry-consistency', `${name} 含级别分类引导`, /Classify (this task|first)|classify the task|A direct, B lightweight/i.test(txt), 'ok');
  add('entry-consistency', `${name} 无旧强制包装`, !txt.includes('EXTREMELY_IMPORTANT') && !txt.includes('You have superpowers'), 'ok');
}

// ---------- 6. 清单与语法 ----------
for (const j of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', 'package.json', '.agents/plugins/marketplace.json']) {
  const f = path.join(pkg, j);
  if (!fs.existsSync(f)) { add('manifest', `${j} 存在`, false, '缺失'); continue; }
  try {
    const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
    const v = obj.version || obj.plugins?.[0]?.version;
    add('manifest', `${j} 合法 JSON`, true, `version=${v ?? 'n/a'}`);
  } catch (e) { add('manifest', `${j} 合法 JSON`, false, e.message); }
}
const plugin = JSON.parse(fs.readFileSync(path.join(pkg, '.claude-plugin/plugin.json'), 'utf8'));
add('manifest', '版本号标记为 fork 版本', /^6\.3\.0-adaptive\.\d+$/.test(plugin.version), plugin.version);

// 所有 harness 清单的版本必须与 package.json 一致（.devin-plugin 的测试就在断言这一点）
const pkgVersion = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).version;
const manifestList = ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json',
  '.cursor-plugin/plugin.json', '.devin-plugin/plugin.json', '.kimi-plugin/plugin.json', 'gemini-extension.json'];
for (const m of manifestList) {
  const f = path.join(pkg, m);
  if (!fs.existsSync(f)) { add('manifest-version', `${m} 版本一致`, false, '文件缺失'); continue; }
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  const v = obj.version || obj.plugins?.[0]?.version;
  add('manifest-version', `${m} 版本一致`, v === pkgVersion, `${v} vs package.json ${pkgVersion}`);
}
const hermesYaml = fs.readFileSync(path.join(pkg, '.hermes-plugin/plugin.yaml'), 'utf8');
const hv = (hermesYaml.match(/^version:\s*(\S+)/m) || [])[1];
add('manifest-version', '.hermes-plugin/plugin.yaml 版本一致', hv === pkgVersion, `${hv} vs ${pkgVersion}`);
add('manifest', '保留上游 attribution', /obra\/superpowers/.test(JSON.stringify(plugin)), plugin.repository || '');
add('manifest', 'LICENSE 保留', fs.existsSync(path.join(pkg, 'LICENSE')), 'ok');

for (const f of walk(pkg, p => p.endsWith('.js') && !rel(p).includes('node_modules'))) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  add('syntax', `node --check ${rel(f)}`, r.status === 0, (r.stderr || '').split('\n')[0] || 'ok');
}
for (const f of walk(pkg, p => p.endsWith('.py'))) {
  const r = spawnSync('python', ['-m', 'py_compile', f], { encoding: 'utf8' });
  add('syntax', `py_compile ${rel(f)}`, r.status === 0, (r.stderr || '').split('\n')[0] || 'ok');
}

// ---------- 7. dot 流程图结构检查（非渲染验证；本机无 Graphviz） ----------
let dotBlocks = 0, dotBad = 0;
for (const f of mdFiles.filter(x => x.endsWith('.md'))) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/```dot\n([\s\S]*?)```/g)) {
    dotBlocks++;
    const body = m[1].replace(/\/\/[^\n]*/g, '');
    const bal = (s, open, close) => (s.split(open).length - s.split(close).length) === 0;
    const ok = bal(body, '{', '}') && bal(body, '(', ')') && bal(body, '[', ']');
    const stmt = body.split('\n').map(l => l.trim()).filter(l => l && !/^(digraph|graph|subgraph|}|\{)/.test(l) && !l.endsWith(';') && !l.endsWith('{') && !l.endsWith('}'));
    if (!ok || stmt.length) { dotBad++; add('dot-structure', `${rel(f)} dot 块结构`, false, ok ? `未以 ; 结束的语句: ${stmt.slice(0, 2).join(' | ')}` : '括号不配对'); }
  }
}
add('dot-structure', `所有 dot 块结构闭合（共 ${dotBlocks} 块，未做渲染验证）`, dotBad === 0, dotBad ? `${dotBad} 块可疑` : 'ok');

// ---------- 输出 ----------
const groups = [...new Set(results.map(r => r.group))];
let failed = 0;
for (const g of groups) {
  const rows = results.filter(r => r.group === g);
  const bad = rows.filter(r => !r.pass);
  failed += bad.length;
  console.log(`\n## ${g}  (${rows.length - bad.length}/${rows.length} 通过)`);
  for (const r of rows) {
    if (!r.pass) console.log(`  FAIL  ${r.name}  :: ${r.evidence}`);
  }
}
console.log(`\n=== 静态检查合计: ${results.length - failed}/${results.length} 通过, ${failed} 失败 ===`);
fs.writeFileSync(path.join(evalDir, 'results', `static-checks${process.argv[3] ? '-' + process.argv[3] : ''}.json`), JSON.stringify(results, null, 2), 'utf8');
process.exit(failed ? 1 : 0);
