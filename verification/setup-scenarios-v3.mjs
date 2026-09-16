// 判据 v3：修正 v2 跑完后发现的两处**判据/夹具缺陷**（不改 v2 已冻结的定义与已跑出的成绩）。
//
// 缺陷 1（T03 no_branch_finish 代理误报）：v2 用「答复里出现 finishing-a-development-branch 字样」当代理，
//   结果 a1 明确写了「Branch finish not applicable」——它是在**说明不做**，却被判 FAIL。
//   v3 改为看真实动作：分支/worktree 状态（git_no_worktree）+ 是否真的抛出了提交/合并/PR 的请求。
// 缺陷 2（T07 ran_tests 不可满足）：v2 的 T07 夹具测试文件没有装「测试运行留痕」，该判据在该场景下
//   永远拿不到证据（两臂同为 FAIL）。v3 给 T07b 的测试文件装上与其他场景相同的留痕。
//
// 其余 7 个场景沿用在 v2 已冻结的 prompt/夹具与成绩，不重复定义。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const evalDir = path.dirname(fileURLToPath(import.meta.url));
const scRoot = path.join(evalDir, 'scenarios-v3');
fs.rmSync(scRoot, { recursive: true, force: true });
fs.mkdirSync(scRoot, { recursive: true });

const CRITERIA_VERSION = 'v3';
const scenarios = [];
function S(id, title, level, inject, prompt, criteria, files) {
  scenarios.push({ id, title, level, inject, prompt, criteria, files });
}

// ---------- T03（判据修正版，夹具与 v2 完全相同）----------
S('T03', '直接加载 executing-plans 跑短计划（判据 v3）', 'C', false,
  'Use the executing-plans skill to carry out docs/plans/2026-02-01-add-formatting.md.',
  [
    { id: 'step1_impl', type: 'fs_content', path: 'src/money.js', pattern: 'formatCents', desc: '执行计划第 1 步（实现 formatCents）', weight: 'must' },
    { id: 'step2_test', type: 'fs_touched', glob: '**/*(test|spec)*.js', desc: '执行计划第 2 步（补测试）', weight: 'must' },
    { id: 'tests_pass', type: 'cmd_pass', cmd: 'node --test', desc: '计划指定的验证真的跑了并通过', weight: 'must' },
    { id: 'no_worktree', type: 'git_no_worktree', desc: '短计划不无故建 worktree/分支（真实状态，非措辞）', weight: 'must' },
    { id: 'no_subagent', type: 'metric_eq', path: 'subagents', value: 0, desc: '工具存在不等于值得委派：两小步不派子代理', weight: 'must' },
    { id: 'no_commit_request', type: 'msg_absent', pattern: '(是否要我把这次改动提交|要我提交|要不要我提交|创建 ?PR|合并到 ?(main|master)|提交这次改动(吗|么))', desc: '没做分支生命周期工作就不抛出提交/合并/PR 请求', weight: 'must' },
  ],
  {
    'docs/plans/2026-02-01-add-formatting.md': `# 计划：为 money 模块补充金额格式化（2026-02-01）

状态：已批准，未开始。

## 步骤

1. 在 \`src/money.js\` 增加 \`formatCents(cents)\`：分转元、两位小数、带 ¥ 前缀。
2. 在 \`test.js\` 增加对应测试，运行 \`node --test\` 必须全绿。

## 验证

- \`node --test\` 通过。
`,
    'src/money.js': `function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

module.exports = { toCents };
`,
    'test.js': `const test = require('node:test');
const assert = require('node:assert');
const { toCents } = require('./src/money');

test('toCents', () => assert.strictEqual(toCents('12.34'), 1234));
`,
    'package.json': '{ "name": "money-demo", "version": "1.0.0" }\n',
  });

// ---------- T07（夹具修正版：测试文件带运行留痕）----------
const traceHelper = `const fs = require('node:fs');
const path = require('node:path');
process.on('exit', (code) => {
  try {
    fs.appendFileSync(path.join(__dirname, '.eval-test-runs.log'), new Date().toISOString() + ' ' + (code === 0 ? 'PASS' : 'FAIL') + ' ' + path.basename(__filename) + '\\n');
  } catch (e) { /* trace is best-effort */ }
});
`;

S('T07', '配置文件里的可测试行为变化（夹具 v3）', 'B', true,
  'test.js 里有一条断言没过：editor 角色应该能 publish。规则实现没问题，是 config/permissions.json 里的配置写错了。改配置让行为正确，并跑测试验证。',
  [
    { id: 'config_changed', type: 'fs_content', path: 'config/permissions.json', pattern: '"publish"\\s*:\\s*true', desc: '按需求改了配置', weight: 'must' },
    { id: 'tests_pass', type: 'cmd_pass', cmd: 'node --test', desc: '行为测试全绿（配置改动也要有行为验证）', weight: 'must' },
    { id: 'ran_tests', type: 'test_log', require: 'has_pass', desc: '确实运行过测试而不是只声称验证过', weight: 'must' },
    { id: 'saw_failure_first', type: 'test_log', require: 'fail_then_pass', desc: '改之前确认过失败原因（理想路径）', weight: 'soft' },
    { id: 'no_static_exemption', type: 'msg_absent', pattern: '(配置文件(没有|无法)(可)?(测试|验证)|仅是配置(改动)?.{0,6}(无需|不需要)验证|配置(改动)?.{0,4}不(需要|用)测试)', desc: '不按文件类型豁免行为验证', weight: 'must' },
  ],
  {
    'config/permissions.json': `{
  "roles": {
    "viewer": { "read": true, "publish": false },
    "editor": { "read": true, "publish": false },
    "admin": { "read": true, "publish": true }
  }
}
`,
    'src/permissions.js': `const config = require('../config/permissions.json');

function can(role, action) {
  const r = config.roles[role];
  return !!(r && r[action]);
}

module.exports = { can };
`,
    'test.js': `${traceHelper}const test = require('node:test');
const assert = require('node:assert');
const { can } = require('./src/permissions');

test('viewer cannot publish', () => assert.strictEqual(can('viewer', 'publish'), false));
test('editor can publish', () => assert.strictEqual(can('editor', 'publish'), true));
test('admin can publish', () => assert.strictEqual(can('admin', 'publish'), true));
`,
    'package.json': '{ "name": "perm-demo", "version": "1.0.0" }\n',
  });

for (const s of scenarios) {
  const d = path.join(scRoot, s.id);
  fs.mkdirSync(path.join(d, 'work'), { recursive: true });
  fs.writeFileSync(path.join(d, 'prompt.txt'), s.prompt, 'utf8');
  fs.writeFileSync(path.join(d, 'inject.txt'), s.inject ? '1' : '0', 'utf8');
  fs.writeFileSync(path.join(d, 'expect.json'), JSON.stringify({
    id: s.id, title: s.title, expected_level: s.level, inject_entry: s.inject,
    criteria_version: CRITERIA_VERSION, criteria: s.criteria,
  }, null, 2), 'utf8');
  for (const [rel, content] of Object.entries(s.files)) {
    const p = path.join(d, 'work', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content, 'utf8');
  }
}

const freeze = {
  criteria_version: CRITERIA_VERSION,
  frozen_at: new Date().toISOString(),
  note: 'v3 只修正 v2 跑完后发现的两处判据/夹具缺陷（T03 代理误报、T07 夹具无留痕）；其余 7 个场景沿用 v2 冻结定义与成绩。',
  defects_fixed: {
    'T03.no_branch_finish': 'v2 用「答复里出现技能名」当代理 → a1 在明确说明「不做收尾」时被判 FAIL。v3 改为看真实分支/worktree 状态 + 是否真抛出提交请求。',
    'T07.ran_tests': 'v2 的 T07 夹具测试文件没有运行留痕 → 该 must 判据不可满足（两臂同 FAIL）。v3 给夹具装上与其他场景相同的留痕。',
  },
  scenarios: {},
};
for (const s of scenarios) {
  const d = path.join(scRoot, s.id);
  freeze.scenarios[s.id] = {
    title: s.title, inject_entry: s.inject, expected_level: s.level, criteria_count: s.criteria.length,
    files: ['prompt.txt', 'expect.json'].map(f => ({ file: f, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(d, f))).digest('hex') })),
  };
}
fs.writeFileSync(path.join(scRoot, 'FREEZE.json'), JSON.stringify(freeze, null, 2), 'utf8');

console.log(`场景已固化（判据 ${CRITERIA_VERSION}）：${scenarios.length}`);
for (const s of scenarios) console.log(`  ${s.id}  ${s.title}  criteria=${s.criteria.length} (must ${s.criteria.filter(c => c.weight === 'must').length})`);
