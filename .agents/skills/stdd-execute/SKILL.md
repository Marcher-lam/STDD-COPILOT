---
name: stdd-execute
description: |
  启动严格的防跑偏 TDD 执行闭环 (The Ralph Loop)。
  触发场景：用户说 '/stdd-execute', 'stdd execute', '执行TDD', 'TDD循环', 'stdd execute'.
metadata:
  author: Marcher-lam
  version: "1.0.0"
---

# STDD TDD 执行循环引擎 (/stdd-execute)

目标：严格死守 "红灯 -> 静态检查 -> 绿灯 -> 伪变异审查 -> 重构" 的隔离微执行护城河。

1. 【聚光灯隔离】：从 `04_tasks.md` 的最顶部挑出一个微小任务。**必须读取 `contracts.md` 接口契约文件以校准输入输出格式**，并清除本任务外的代码上下文。
2. 【Red 阶段 (强制拦截)】：生成必然失败的单元/集成测试。绝对不可顺带写被测功能的实现。
3. 【静态质检 (Lint/Type Gate)】：在跑自动化脚本前，用当前技术栈推荐命令（如 `tsc` / 纯语法树扫描引擎）进行语法把控。低级报错在这里直接修复。
4. 【Green 阶段 (婴儿步)】：极度吝啬地只写让测试苟且跑通的"最简代码"。严厉禁止自行补充超纲要求。
5. 【Run & Fix 报错死锁阈值】：使用 `foundation.md` 里硬性规定的 CLI 命令（如 `vitest run {file}`）！
   - 捕获报错，最多尝试自我修复 **3次**。
   - 超过3次仍是红灯，停止发疯并向用户宣告死锁。由人工判断或运行 `/stdd-revert` 切断幻象分支。
6. 【伪变异审查 (AI Assertion Review)】：测试亮绿灯后，强制自己扮演严厉的 Reviewer，质检刚才自己写的测试。如果发现充满全是 Mock 或像 `expect(res).toBeTruthy()` 这种缺乏鉴权能力的"骗绿灯断言"，将其打回重作！
7. 【Refactor 代码清理】：安全审查后，优化模块结构。
8. 【更新并前进】：完成则打勾 `[x]` 并继续进入下一个框。清空清单后提示 `/stdd-commit`。
