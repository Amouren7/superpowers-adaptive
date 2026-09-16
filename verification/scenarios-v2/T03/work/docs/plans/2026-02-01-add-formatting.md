# 计划：为 money 模块补充金额格式化（2026-02-01）

状态：已批准，未开始。

## 步骤

1. 在 `src/money.js` 增加 `formatCents(cents)`：分转元、两位小数、带 ¥ 前缀。
2. 在 `test.js` 增加对应测试，运行 `node --test` 必须全绿。

## 验证

- `node --test` 通过。
