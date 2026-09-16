# 已尝试的修复（三次都失败）

1. 加了 try/catch 兜底默认值 —— 测试仍然失败。
2. 校验了配置文件是否存在 —— 文件都在，仍然失败。
3. 把 JSON.parse 换成 readFileSync + parse 两步 —— 仍然失败。

现象：test.js 里把 process.env.APP_MODE 设成 prod 之后断言 retries 应该是 3，但拿到的是 1。
