// 校验 .dsh-plugin 的实际发布文件：注册行为 + 主/子代理判定。
// 直接 apply() 到假的 ctx 上，捕获注册的 prompt context，再用各种装配上下文调用它。
// 用法: node verification/check-dsh-plugin.mjs [插件目录，默认 ../.dsh-plugin]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = process.argv[2] || path.join(here, '..', '.dsh-plugin');
const entryFile = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'plugins', 'superpowers', 'skills', 'using-superpowers', 'SKILL.md');

const results = [];
const check = (id, ok, evidence) => { results.push({ id, pass: !!ok, evidence: String(evidence).slice(0, 200) }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${String(evidence).slice(0, 160)}`); };

const mod = await import(pathToFileURL(path.join(pluginDir, 'lib', 'index.js')).href);
check('module-exports', typeof mod.apply === 'function' && typeof mod.name === 'string', `name=${mod.name} apply=${typeof mod.apply}`);

let registered;
const ctx = {
  effect: (fn) => { const d = fn(); return typeof d === 'function' ? d : () => {}; },
  systemPrompt: { context: (c) => { registered = c; return () => {}; } },
  logger: { info: () => {}, warn: (m) => console.log('   [warn]', m) },
};
mod.apply(ctx);
check('registers-one-context', !!registered, registered ? `name=${registered.name} order=${registered.order}` : 'nothing registered');
if (!registered) process.exit(1);
check('text-is-provider', typeof registered.text === 'function', typeof registered.text);

const entryExists = fs.existsSync(entryFile);
const rootText = registered.text({ agent: { meta: { delegationDepth: 0 } } });
const subText = registered.text({ agent: { meta: { delegationDepth: 1 } } });
const bareText = registered.text({});
const noCtxText = registered.text(undefined);

if (entryExists) {
  check('root-agent-gets-entry', rootText.length > 4000 && rootText.includes('<SUPERPOWERS>'), `${rootText.length} chars, has <SUPERPOWERS>=${rootText.includes('<SUPERPOWERS>')}`);
  check('missing-context-still-injects', bareText.length === rootText.length, `bare=${bareText.length} root=${rootText.length}（读不到 agent 时按主会话处理）`);
  check('undefined-context-still-injects', noCtxText.length === rootText.length, `undefined=${noCtxText.length}`);
} else {
  check('root-agent-gets-entry', false, `入口文件不存在: ${entryFile}`);
}
check('subagent-gets-nothing', subText === '', `delegationDepth=1 -> ${JSON.stringify(subText)}`);
check('entry-matches-installed-skill', !entryExists || rootText.includes(fs.readFileSync(entryFile, 'utf8').trim().slice(0, 200)), '注入内容包含已安装入口技能的开头');

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
